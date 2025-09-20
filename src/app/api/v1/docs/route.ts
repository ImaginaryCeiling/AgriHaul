import { NextResponse } from 'next/server'

const API_DOCS = {
  openapi: "3.0.0",
  info: {
    title: "AgriHaul API",
    description: "REST API for the AgriHaul agricultural transportation marketplace",
    version: "1.0.0",
    contact: {
      name: "AgriHaul Support",
      email: "support@agrihaul.com"
    }
  },
  tags: [
    {
      name: "Users",
      description: "User management operations for farmers and carriers"
    },
    {
      name: "Jobs",
      description: "Job posting, management, and lifecycle operations"
    },
    {
      name: "Ratings",
      description: "Rating and trust score management"
    },
    {
      name: "Statistics",
      description: "Platform analytics and statistics"
    }
  ],
  servers: [
    {
      url: "/api/v1",
      description: "Production server"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key"
      }
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          role: { type: "string", enum: ["farmer", "carrier"] },
          name: { type: "string" },
          phone: { type: "string", nullable: true },
          equipment: { type: "array", items: { type: "string" } },
          crops: { type: "array", items: { type: "string" } },
          trust_score: { type: "integer", minimum: 0, maximum: 100 },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" }
        }
      },
      Job: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          farmer_id: { type: "string", format: "uuid" },
          carrier_id: { type: "string", format: "uuid", nullable: true },
          crop: { type: "string" },
          equipment_needed: { type: "array", items: { type: "string" } },
          pickup_address: { type: "string" },
          dropoff_address: { type: "string" },
          pickup_coordinates: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
          dropoff_coordinates: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
          load_size: { type: "number", minimum: 0 },
          status: { type: "string", enum: ["open", "accepted", "in_transit", "delivered", "paid", "cancelled"] },
          is_perishable: { type: "boolean" },
          posted_at: { type: "string", format: "date-time" },
          payout_dollars: { type: "number", minimum: 0 },
          notes: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" }
        }
      },
      Rating: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          job_id: { type: "string", format: "uuid" },
          rater_id: { type: "string", format: "uuid" },
          ratee_id: { type: "string", format: "uuid" },
          on_time: { type: "integer", minimum: 0, maximum: 10, nullable: true },
          communication: { type: "integer", minimum: 0, maximum: 10, nullable: true },
          accuracy: { type: "integer", minimum: 0, maximum: 10, nullable: true },
          condition: { type: "integer", minimum: 0, maximum: 10, nullable: true },
          compliance: { type: "integer", minimum: 0, maximum: 10, nullable: true },
          resolution: { type: "integer", minimum: 0, maximum: 10, nullable: true },
          comment: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" }
        }
      },
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { type: "object" },
          message: { type: "string" },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" }
            }
          }
        }
      },
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          error: { type: "string" }
        }
      }
    }
  },
  security: [
    { BearerAuth: [] },
    { ApiKeyAuth: [] }
  ],
  paths: {
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        description: "Retrieve a paginated list of users with optional filtering",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 }
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: "role",
            in: "query",
            schema: { type: "string", enum: ["farmer", "carrier"] }
          },
          {
            name: "trust_score.gte",
            in: "query",
            schema: { type: "integer", minimum: 0, maximum: 100 }
          },
          {
            name: "trust_score.lte",
            in: "query",
            schema: { type: "integer", minimum: 0, maximum: 100 }
          }
        ],
        responses: {
          "200": {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/User" }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Users"],
        summary: "Create user",
        description: "Create a new user (requires admin API key)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "role", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  role: { type: "string", enum: ["farmer", "carrier"] },
                  name: { type: "string" },
                  phone: { type: "string" },
                  equipment: { type: "array", items: { type: "string" } },
                  crops: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "User created successfully",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: { $ref: "#/components/schemas/User" }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" }
          }
        ],
        responses: {
          "200": {
            description: "User details",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: { $ref: "#/components/schemas/User" }
                      }
                    }
                  ]
                }
              }
            }
          },
          "404": {
            description: "User not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          }
        }
      }
    },
    "/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "List jobs",
        description: "Retrieve a paginated list of jobs with optional filtering",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 }
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["open", "accepted", "in_transit", "delivered", "paid", "cancelled"] }
          },
          {
            name: "crop",
            in: "query",
            schema: { type: "string" }
          },
          {
            name: "farmer_id",
            in: "query",
            schema: { type: "string", format: "uuid" }
          },
          {
            name: "carrier_id",
            in: "query",
            schema: { type: "string", format: "uuid" }
          },
          {
            name: "is_perishable",
            in: "query",
            schema: { type: "boolean" }
          }
        ],
        responses: {
          "200": {
            description: "List of jobs",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Job" }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Jobs"],
        summary: "Create job",
        description: "Create a new job posting",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["crop", "load_size", "payout_dollars", "pickup_address", "dropoff_address"],
                properties: {
                  crop: { type: "string" },
                  load_size: { type: "number", minimum: 0 },
                  payout_dollars: { type: "number", minimum: 0 },
                  pickup_address: { type: "string" },
                  dropoff_address: { type: "string" },
                  pickup_coordinates: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                  dropoff_coordinates: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                  equipment_needed: { type: "array", items: { type: "string" } },
                  is_perishable: { type: "boolean" },
                  notes: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Job created successfully",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: { $ref: "#/components/schemas/Job" }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/jobs/{id}": {
      get: {
        tags: ["Jobs"],
        summary: "Get job by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" }
          }
        ],
        responses: {
          "200": {
            description: "Job details with related data",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: { $ref: "#/components/schemas/Job" }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/jobs/{id}/accept": {
      post: {
        tags: ["Jobs"],
        summary: "Accept job",
        description: "Accept a job as a carrier",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" }
          }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  carrier_id: {
                    type: "string",
                    format: "uuid",
                    description: "Required when using API key authentication"
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Job accepted successfully",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: { $ref: "#/components/schemas/Job" }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/ratings": {
      get: {
        tags: ["Ratings"],
        summary: "List ratings",
        description: "Retrieve ratings with optional filtering",
        parameters: [
          {
            name: "job_id",
            in: "query",
            schema: { type: "string", format: "uuid" }
          },
          {
            name: "rater_id",
            in: "query",
            schema: { type: "string", format: "uuid" }
          },
          {
            name: "ratee_id",
            in: "query",
            schema: { type: "string", format: "uuid" }
          }
        ],
        responses: {
          "200": {
            description: "List of ratings",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Rating" }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Ratings"],
        summary: "Submit rating",
        description: "Submit a rating for a completed job",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["job_id", "ratee_id"],
                properties: {
                  job_id: { type: "string", format: "uuid" },
                  ratee_id: { type: "string", format: "uuid" },
                  on_time: { type: "integer", minimum: 0, maximum: 10 },
                  communication: { type: "integer", minimum: 0, maximum: 10 },
                  accuracy: { type: "integer", minimum: 0, maximum: 10 },
                  condition: { type: "integer", minimum: 0, maximum: 10 },
                  compliance: { type: "integer", minimum: 0, maximum: 10 },
                  resolution: { type: "integer", minimum: 0, maximum: 10 },
                  comment: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Rating submitted successfully",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: { $ref: "#/components/schemas/Rating" }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/stats": {
      get: {
        tags: ["Statistics"],
        summary: "Get platform statistics",
        description: "Retrieve comprehensive platform statistics",
        responses: {
          "200": {
            description: "Platform statistics",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            users: { type: "object" },
                            jobs: { type: "object" },
                            ratings: { type: "object" },
                            revenue: { type: "object" },
                            recent_activity: { type: "object" }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}

export async function GET() {
  return NextResponse.json(API_DOCS)
}