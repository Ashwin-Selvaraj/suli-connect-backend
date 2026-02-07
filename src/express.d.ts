declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone?: string | null;
        role: string;
        domainId?: string | null;
        teamId?: string | null;
        reportingManagerId?: string | null;
      };
    }
  }
}

export {};
