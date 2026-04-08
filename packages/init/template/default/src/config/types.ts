export type DatabaseConfig = {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  url: string;
};

export type AppConfig = {
  port: number;
  database: DatabaseConfig;
};
