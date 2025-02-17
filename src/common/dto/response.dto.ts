export class SuccessResponseDTO<T> {
  status: string;
  statusCode: number;
  message: string;
  data: T[];
}
