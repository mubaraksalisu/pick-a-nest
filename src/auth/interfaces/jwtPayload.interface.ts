export interface JwtPayload {
  _id: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
}
