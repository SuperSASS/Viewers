import ApiClient from "../utils/api"
import { toolGroupIds } from "../common/HangingProtocolModuleConfig"

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
