import { Queue } from "./queue.ts";
import { UploadRequestOptions,UploadProgressEvent } from './type.ts'

const SCOPE = "ElUpload";

class UploadAjaxError extends Error {
  name = "UploadAjaxError";
  status: number;
  method: string;
  url: string;

  constructor(message: string, status: number, method: string, url: string) {
    super(message);
    this.status = status;
    this.method = method;
    this.url = url;
  }
}

class ElementPlusError extends Error {
  constructor(m: string) {
    super(m);
    this.name = "ElementPlusError";
  }
}

function throwError(scope: string, m: string): never {
  throw new ElementPlusError(`[${scope}] ${m}`);
}

function getError(
  action: string,
  option: UploadRequestOptions,
  xhr: XMLHttpRequest,
) {
  let msg: string;
  if (xhr.response) {
    msg = `${xhr.response.error || xhr.response}`;
  } else if (xhr.responseText) {
    msg = `${xhr.responseText}`;
  } else {
    msg = `fail to ${option.method} ${action} ${xhr.status}`;
  }

  return new UploadAjaxError(msg, xhr.status, option.method, action);
}

function getBody(xhr: XMLHttpRequest): XMLHttpRequestResponseType {
  const text = xhr.responseText || xhr.response;
  if (!text) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const useHttpRequest = (option: { concurrency: number }) => {
  const { concurrency } = option;
  const queue = new Queue({ concurrency });
  const httpRequest = (
    options: UploadRequestOptions,
  ): XMLHttpRequest | Promise<unknown> => {
    if (typeof XMLHttpRequest === "undefined")
      throwError(SCOPE, "XMLHttpRequest is undefined");

    const xhr = new XMLHttpRequest();
    const action = options.action;

    const rawAbort = xhr.abort.bind(xhr);

    xhr.abort = () => {
      queue.remove(options.file.uid);
      rawAbort();
    };

    if (xhr.upload) {
      xhr.upload.addEventListener("progress", (evt) => {
        const progressEvt = evt as UploadProgressEvent;
        progressEvt.percent =
          evt.total > 0 ? (evt.loaded / evt.total) * 100 : 0;
        options.onProgress(progressEvt);
      });
    }
    const formData = new FormData();
    if (options.data) {
      for (const [key, value] of Object.entries(options.data)) {
        if (Array.isArray(value)) {
          if (
            value.length === 2 &&
            value[0] instanceof Blob &&
            typeof value[1] == "string"
          ) {
            formData.append(key, value[0], value[1]);
          } else {
            value.forEach((item) => {
              formData.append(key, item);
            });
          }
        } else formData.append(key, value);
      }
    }
    formData.append(options.filename, options.file, options.file.name);

    xhr.open(options.method, action, true);

    if (options.withCredentials && "withCredentials" in xhr) {
      xhr.withCredentials = true;
    }

    const headers = options.headers || {};
    if (headers instanceof Headers) {
      headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    } else {
      for (const [key, value] of Object.entries(headers)) {
        if (value == null) continue;
        xhr.setRequestHeader(key, String(value));
      }
    }

    queue.add(
      options.file.uid,
      () =>
        new Promise((resolve, reject) => {
          xhr.addEventListener("abort", () => {
            resolve(true);
          });
          xhr.addEventListener("error", () => {
            options.onError(getError(action, options, xhr));
            reject();
          });

          xhr.addEventListener("load", () => {
            if (xhr.status < 200 || xhr.status >= 300) {
              reject();
              return options.onError(getError(action, options, xhr));
            }
            options.onSuccess(getBody(xhr));
            resolve(true);
          });
          xhr.send(formData);
        }),
    );

    return xhr;
  };

  return { httpRequest };
};

export { useHttpRequest };
