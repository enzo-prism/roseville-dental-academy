declare module "pg" {
  export class Client {
    constructor(config: { connectionString: string });
    connect(): Promise<void>;
    query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<{ rows: T[] }>;
    end(): Promise<void>;
    processID?: number;
  }
  const pg: { Client: typeof Client };
  export default pg;
}
