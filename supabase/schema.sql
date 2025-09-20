-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE user_role AS ENUM ('farmer', 'carrier');
CREATE TYPE job_status AS ENUM ('open', 'accepted', 'in_transit', 'delivered', 'paid', 'cancelled');
CREATE TYPE event_type AS ENUM ('job_posted', 'job_accepted', 'job_started', 'job_delivered', 'job_paid', 'job_cancelled', 'route_declared');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role user_role NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    home_location GEOGRAPHY(POINT, 4326),
    equipment TEXT[] DEFAULT '{}', -- for carriers
    crops TEXT[] DEFAULT '{}', -- for farmers
    trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    farmer_id UUID REFERENCES profiles(id) NOT NULL,
    carrier_id UUID REFERENCES profiles(id),
    crop TEXT NOT NULL,
    equipment_needed TEXT[] DEFAULT '{}',
    pickup_point GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_point GEOGRAPHY(POINT, 4326) NOT NULL,
    pickup_address TEXT,
    dropoff_address TEXT,
    load_size NUMERIC NOT NULL CHECK (load_size > 0),
    status job_status DEFAULT 'open',
    is_perishable BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    payout_cents INTEGER NOT NULL CHECK (payout_cents > 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job segments table (for crowdsourcing)
CREATE TABLE job_segments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    carrier_id UUID REFERENCES profiles(id) NOT NULL,
    pickup_point GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_point GEOGRAPHY(POINT, 4326) NOT NULL,
    pickup_address TEXT,
    dropoff_address TEXT,
    load_size NUMERIC NOT NULL CHECK (load_size > 0),
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (audit trail)
CREATE TABLE events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    type event_type NOT NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proof of delivery assets
CREATE TABLE pod_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings table
CREATE TABLE ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    rater_id UUID REFERENCES profiles(id) NOT NULL,
    ratee_id UUID REFERENCES profiles(id) NOT NULL,
    on_time INTEGER CHECK (on_time >= 0 AND on_time <= 10),
    communication INTEGER CHECK (communication >= 0 AND communication <= 10),
    accuracy INTEGER CHECK (accuracy >= 0 AND accuracy <= 10),
    condition INTEGER CHECK (condition >= 0 AND condition <= 10),
    compliance INTEGER CHECK (compliance >= 0 AND compliance <= 10),
    resolution INTEGER CHECK (resolution >= 0 AND resolution <= 10),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, rater_id)
);

-- Create indexes for better performance
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_farmer_id ON jobs(farmer_id);
CREATE INDEX idx_jobs_carrier_id ON jobs(carrier_id);
CREATE INDEX idx_jobs_location ON jobs USING GIST(pickup_point);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_location ON profiles USING GIST(home_location);
CREATE INDEX idx_events_job_id ON events(job_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_ratings_job_id ON ratings(job_id);
CREATE INDEX idx_ratings_ratee_id ON ratings(ratee_id);

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Jobs policies
CREATE POLICY "Anyone can view open jobs" ON jobs
    FOR SELECT USING (status = 'open');

CREATE POLICY "Farmers and carriers can view their jobs" ON jobs
    FOR SELECT USING (
        farmer_id = auth.uid() OR
        carrier_id = auth.uid()
    );

CREATE POLICY "Farmers can insert jobs" ON jobs
    FOR INSERT WITH CHECK (
        farmer_id = auth.uid() AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'farmer')
    );

CREATE POLICY "Farmers can update their own jobs" ON jobs
    FOR UPDATE USING (farmer_id = auth.uid());

CREATE POLICY "Carriers can update jobs they're assigned to" ON jobs
    FOR UPDATE USING (carrier_id = auth.uid());

-- Job segments policies
CREATE POLICY "Carriers can view their segments" ON job_segments
    FOR SELECT USING (carrier_id = auth.uid());

CREATE POLICY "Carriers can insert their segments" ON job_segments
    FOR INSERT WITH CHECK (
        carrier_id = auth.uid() AND
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'carrier')
    );

CREATE POLICY "Job participants can view segments" ON job_segments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = job_segments.job_id
            AND (jobs.farmer_id = auth.uid() OR jobs.carrier_id = auth.uid())
        )
    );

-- Events policies
CREATE POLICY "Users can view events for their jobs" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = events.job_id
            AND (jobs.farmer_id = auth.uid() OR jobs.carrier_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert events" ON events
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- POD assets policies
CREATE POLICY "Job participants can view POD assets" ON pod_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = pod_assets.job_id
            AND (jobs.farmer_id = auth.uid() OR jobs.carrier_id = auth.uid())
        )
    );

CREATE POLICY "Carriers can insert POD assets" ON pod_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = pod_assets.job_id
            AND jobs.carrier_id = auth.uid()
        )
    );

-- Ratings policies
CREATE POLICY "Users can view ratings about them" ON ratings
    FOR SELECT USING (ratee_id = auth.uid());

CREATE POLICY "Job participants can view job ratings" ON ratings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = ratings.job_id
            AND (jobs.farmer_id = auth.uid() OR jobs.carrier_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert ratings" ON ratings
    FOR INSERT WITH CHECK (
        rater_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = ratings.job_id
            AND (jobs.farmer_id = auth.uid() OR jobs.carrier_id = auth.uid())
        )
    );

-- Functions for trust score calculation
CREATE OR REPLACE FUNCTION calculate_job_score(
    p_on_time INTEGER,
    p_communication INTEGER,
    p_accuracy INTEGER,
    p_condition INTEGER,
    p_compliance INTEGER,
    p_resolution INTEGER
) RETURNS INTEGER AS $$
BEGIN
    RETURN LEAST(100, GREATEST(0,
        ROUND(
            (p_on_time * 0.30) +
            (p_accuracy * 0.20) +
            (p_communication * 0.15) +
            (p_compliance * 0.15) +
            (p_condition * 0.10) +
            (p_resolution * 0.10)
        ) * 10
    ));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_trust_score() RETURNS TRIGGER AS $$
DECLARE
    new_job_score INTEGER;
    current_trust_score INTEGER;
    updated_trust_score INTEGER;
BEGIN
    -- Calculate the new job score
    new_job_score := calculate_job_score(
        NEW.on_time,
        NEW.communication,
        NEW.accuracy,
        NEW.condition,
        NEW.compliance,
        NEW.resolution
    );

    -- Get current trust score
    SELECT trust_score INTO current_trust_score
    FROM profiles
    WHERE id = NEW.ratee_id;

    -- Calculate updated trust score (80% old, 20% new)
    updated_trust_score := ROUND(current_trust_score * 0.8 + new_job_score * 0.2);

    -- Update the trust score
    UPDATE profiles
    SET trust_score = updated_trust_score,
        updated_at = NOW()
    WHERE id = NEW.ratee_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trust score updates
CREATE TRIGGER trigger_update_trust_score
    AFTER INSERT ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_trust_score();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;