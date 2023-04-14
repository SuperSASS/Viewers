import ApiClient from "../Utils/api"
import { toolGroupIds } from "../Common/HangingProtocolModuleConfig"

export default function getUtilityModule() {
  return [
    {
      name: 'api',
      exports: {
        ApiClient
      }
    },
    {
      name: 'common',
      exports: {
        toolGroupIds
      }
    }
  ]
}
