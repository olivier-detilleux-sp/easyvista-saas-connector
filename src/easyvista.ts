import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios'

const ACCOUNT_ATTRIBUTES = [
    'EMPLOYEE_ID',
    'LAST_NAME',
    'HREF',
    'E_MAIL',
    'CELLULAR_NUMBER',
    'PHONE_NUMBER',
    'IDENTIFICATION',
    'LOGIN',
    'MANAGER_ID',
    'BEGIN_OF_CONTRACT',
    'END_OF_CONTRACT',
    'PROFIL_ID',
    'LOCATION_ID',
    'LOCATION.LOCATION_CODE',
    'LOCATION.LOCATION_FR',
    'LOCATION.LOCATION_PATH',
    'LOCATION.CITY',
    'DEPARTMENT_ID',
    'DEPARTMENT.DEPARTMENT_CODE',
    'DEPARTMENT.DEPARTMENT_FR',
    'DEPARTMENT.DEPARTMENT_PATH',
    'DEPARTMENT.DEPARTMENT_LABEL',
]

export class EasyVistaClient {
    private client: AxiosInstance

    constructor(config: any) {
        const baseConfig: AxiosRequestConfig = {
            baseURL: config.url,
        }
        if (config.auth === 'auth.basic') {
            baseConfig.auth = {
                username: config['basic.username'],
                password: config['basic.password'],
            }
        } else {
            baseConfig.headers = {
                Authorization: `Bearer ${config['token.value']}`,
            }
        }
        this.client = axios.create(baseConfig)
    }

    async testConnection(): Promise<AxiosResponse> {
        const url = `/license`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async listEmployees(max_rows?: number): Promise<AxiosResponse> {
        const url = `/employees`
        const fields = ACCOUNT_ATTRIBUTES.join(',')

        if (!max_rows) {
            const response = await this.listEmployees(1)
            max_rows = response.data.total_record_count as number
        }
        const request: AxiosRequestConfig = {
            method: 'get',
            url,
            params: {
                max_rows,
                fields,
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async listGroups(max_rows?: number): Promise<AxiosResponse> {
        const url = `/groups`

        if (!max_rows) {
            const response = await this.listEmployees(1)
            max_rows = response.data.total_record_count as number
        }
        const request: AxiosRequestConfig = {
            method: 'get',
            url,
            params: {
                max_rows,
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async getGroup(id: string): Promise<AxiosResponse> {
        const url = `/groups/${id}`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async getAccount(id: string): Promise<AxiosResponse> {
        const url = `/employees/${id}`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async getGroupMembership(id: string): Promise<AxiosResponse> {
        const url = `/employees/${id}/groups`

        const request: AxiosRequestConfig = {
            method: 'get',
            url,
        }

        const response = await this.client.request(request)

        return response
    }

    async setProfil(id: string, profil: number): Promise<AxiosResponse> {
        const url = `/employees/${id}`

        const request: AxiosRequestConfig = {
            method: 'put',
            url,
            data: {
                profil_id: profil,
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async updateAccount(id: string, data: any): Promise<AxiosResponse> {
        const url = `/employees/${id}`

        const request: AxiosRequestConfig = {
            method: 'put',
            url,
            data,
        }

        const response = await this.client.request(request)

        return response
    }

    async createAccount(account: any): Promise<AxiosResponse> {
        const url = `/employees`

        const request: AxiosRequestConfig = {
            method: 'post',
            url,
            data: {
                employees: [account],
            },
        }

        const response = await this.client.request(request)

        return response
    }

    async addGroupMember(group_id: string, employee_id: string): Promise<AxiosResponse> {
        const url = `/groups/${group_id}/employees/${employee_id}`

        const request: AxiosRequestConfig = {
            method: 'post',
            url,
            data: {},
        }

        const response = await this.client.request(request)

        return response
    }

    async removeGroupMember(group_id: string, employee_id: string): Promise<AxiosResponse> {
        const url = `/groups/${group_id}/employees/${employee_id}`

        const request: AxiosRequestConfig = {
            method: 'delete',
            url,
        }

        const response = await this.client.request(request)

        return response
    }
}
