// import axios from axios
import axios, { AxiosInstance } from "axios";

// const ApiUrl = "https://mock.apifox.cn/m1/2236001-0-default";
const ApiUrl = "http://localhost:65500";
const ApiTimeout = 0; // 永不超时

class HttpClient {
  private readonly Client: AxiosInstance;

  constructor() {
    this.Client = axios.create({
      baseURL: ApiUrl,
      timeout: ApiTimeout,
    })

    this.Client.interceptors.response.use(
      (res) => res,
      (err) => {
        try {
          if (err.response) {
            console.error(`!API Error - (${err.response.status}): ` + err.response.statusText);
            throw new Error(err.response.data.message);
          }
          else
            console.error(`!API Error - (${err})`);
        }
        catch (e) { throw e; }
      }
    )
  }

  public async ApplyModelAll(data: ApplyModelAllType): Promise<ResponseType> {
    const url = "/User/Model/ApplyModel";
    const response = await this.Client.post(url, {}, { params: data });
    return response;
  }

  public async UploadFile(data: UploadFileTyoe): Promise<ResponseType> {
    const url = "/User/Image/UploadImage";
    const headers = {
      'Content-Type': 'multipart/form-data'
    };
    const response = await this.Client.post(url, data, { headers });
    return response;
  }

  public async UploadModel(data: UploadModelType): Promise<ResponseType> {
    const url = "/User/Model/AddModel";
    const headers = {
      'Content-Type': 'multipart/form-data'
    };
    const response = await this.Client.post(url, data, { headers });
    return response;
  }

  public async GetModels(): Promise<ResponseType> {
    const url = "/User/Model/GetModels";
    const response = await this.Client.get(url);
    return response;
  }
  public async Reprocess(data: ReprocessType): Promise<ResponseType> {
    const url = "/User/Model/Segment/Reprocess";
    const headers = {
      'Content-Type': 'multipart/form-data'
    };
    const response = await this.Client.post(url, {}, { params: data });
    return response;
  }
  public async DownloadSeg(data: DownloadSegType): Promise<ResponseType> {
    const url = "/User/Image/Download";
    const response = await this.Client.post(url, {}, { params: data });
    return response;
  }

}


const ApiClient = new HttpClient();

export default ApiClient;

export type ResponseType = {
  status: number,// `statusText` 来自服务器响应的 HTTP 状态信息
  statusText: string, // `statusText` 来自服务器响应的 HTTP 状态信息
  headers: object, // `headers` 是服务器响应头
  config: object, // `config` 是 `axios` 请求的配置信息
  data: object, // 响应数据
};
export type GetModelsDataType = {
  Id: number;
  Name: string;
  Description: string;
}
// -----------------------
export type ApplyModelAllType = {
  studyUid: string,
  seriesUid: string,
  ModelId: number,
  apifoxResponseId?: string,
};
export type DownloadSegType = {
  studyUid: string,
  seriesUid: string,
  instanceUid: string
  apifoxResponseId?: string,
};
export type ReprocessType =
  {
    studyUid: string,
    seriesUid: string,
    script: string,
  };
export type UploadFileTyoe = FormData
export type UploadModelType = FormData
