export interface UploadProgressEvent extends ProgressEvent<EventTarget> {
  percent: number;
}

interface UploadRawFile extends File {
  uid: number;
  isDirectory?: boolean;
}

declare class UploadAjaxError extends Error {
  name: string;
  status: number;
  method: string;
  url: string;
  constructor(message: string, status: number, method: string, url: string);
}

export interface UploadRequestOptions {
  action: string;
  method: string;
  data: Record<string, string | Blob | [string | Blob, string] | string[]>;
  filename: string;
  file: UploadRawFile;
  headers: Headers | Record<string, string | number | null | undefined>;
  onError: (error: UploadAjaxError) => void;
  onProgress: (evt: UploadProgressEvent) => void;
  onSuccess: (response: any) => void;
  withCredentials: boolean;
}
