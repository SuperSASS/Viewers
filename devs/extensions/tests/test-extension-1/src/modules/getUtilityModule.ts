import ApiClient from "../utils/api"

export default function getUtilityModule() {
  return [
    {
      name: 'api',
      exports: {
        ApiClient
      }
    },
    {

    }
  ]
}
