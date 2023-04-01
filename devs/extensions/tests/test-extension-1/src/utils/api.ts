// import axios from axios
import axios, { AxiosInstance } from "axios";

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
        console.error(`!API Error - ApplyModelAll(${err.response.status}): ` + err.response.statusText);
        throw new Error(err.response.data.message);
      }
    )
  }

  public async ApplyModelAll(data: ApplyModelAllType): Promise<ResponseType> {
    const url = "/User/forecast";
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
}

export type ApplyModelAllType = {
  studyUid: string,
  seriesUid: string,
  segType: number,
  apifoxResponseId?: string,
};
