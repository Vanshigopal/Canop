declare namespace Express {
  interface Request {
    tenant?: {
      id: string;
      slug: string;
      name: string;
      status: string;
      tier: string;
      logoUrl: string | null;
      primaryColor: string | null;
      tagline: string | null;
      timezone: string;
    };
    tenantId?: string;
  }
}
