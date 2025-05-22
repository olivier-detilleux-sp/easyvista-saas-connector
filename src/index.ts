import {
    Context,
    createConnector,
    readConfig,
    Response,
    logger,
    StdAccountListOutput,
    StdTestConnectionOutput,
    StdAccountListInput,
    StdEntitlementListInput,
    StdEntitlementListOutput,
    StdAccountReadInput,
    StdAccountReadOutput,
    ConnectorError,
    ConnectorErrorType,
    StdAccountCreateInput,
    StdAccountCreateOutput,
    StdAccountUpdateInput,
    StdAccountUpdateOutput,
    StdAccountDisableInput,
    StdAccountDisableOutput,
    StdAccountEnableInput,
    StdAccountEnableOutput,
    StdEntitlementReadInput,
    StdEntitlementReadOutput,
    AttributeChangeOp,
    StdTestConnectionInput,
} from '@sailpoint/connector-sdk'
import { EasyVistaClient } from './easyvista'
import { Account } from './model/account'
import { Group } from './model/group'
import { format, parse, subDays } from 'date-fns'
import { AxiosResponse } from 'axios'

const INPUT_DATE_FORMAT = 'dd/MM/yyyy'
const OUTPUT_DATE_FORMAT = 'yyyy-MM-dd'

// const buildEmployee = (attributes: Attributes): any => {
//     const employee = {
//         identification: attributes.IDENTIFICATION,
//         last_name: attributes.LAST_NAME,
//         login: attributes.LOGIN,
//         phone_number: attributes.PHONE_NUMBER,
//         e_mail: attributes.E_MAIL,
//         location_id: attributes.LOCATION_ID,
//         department_id: attributes.DEPARTMENT_ID,
//     }

//     return employee
// }

const urlToID = (url: string): string => {
    const id = url.split('/').pop()
    return id ? id : ''
}

// Connector must be exported as module property named connector
export const connector = async () => {
    // Get connector source config
    const config = await readConfig()

    // Use the vendor SDK, or implement own client as necessary, to initialize a client
    const client = new EasyVistaClient(config)

    const buildAccount = async (rawAccount: any): Promise<Account> => {
        const account = new Account(rawAccount)
        const response = await client.getGroupMembership(account.identity)
        account.attributes.GROUPS = response.data.groups.map((x: string) => urlToID(x))
        if (account.attributes.BEGIN_OF_CONTRACT !== '') {
            const date = parse(account.attributes.BEGIN_OF_CONTRACT as string, OUTPUT_DATE_FORMAT, Date.now())
            const dateString = format(date, INPUT_DATE_FORMAT)
            if (Date.now() - date.valueOf() > 0) {
                account.disabled = true
            }
            account.attributes.BEGIN_OF_CONTRACT = dateString
        }
        if (account.attributes.END_OF_CONTRACT !== '') {
            const date = parse(account.attributes.END_OF_CONTRACT as string, OUTPUT_DATE_FORMAT, Date.now())
            const dateString = format(date, INPUT_DATE_FORMAT)
            account.attributes.END_OF_CONTRACT = dateString
        }

        return account
    }

    return createConnector()
        .stdTestConnection(
            async (context: Context, input: StdTestConnectionInput, res: Response<StdTestConnectionOutput>) => {
                logger.info('Running test connection')
                const response = await client.testConnection()
                res.send({})
            }
        )
        .stdAccountList(async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
            const response = await client.listEmployees()

            for (const rawAccount of response.data.records) {
                const account = await buildAccount(rawAccount)
                logger.info(account)
                res.send(account)
            }
        })
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            logger.info(input)
            try {
                const response = await client.getAccount(input.identity)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)
                logger.info(account)
                res.send(account)
            } catch (error) {
                throw new ConnectorError('Account not found', ConnectorErrorType.NotFound)
            }
        })
        .stdAccountCreate(
            async (context: Context, input: StdAccountCreateInput, res: Response<StdAccountCreateOutput>) => {
                logger.info(input)
                const groups = [].concat(input.attributes.GROUPS)
                const employee = input.attributes
                delete employee.GROUPS

                let response = await client.createAccount(employee)
                const HREF: string = response.data.HREF
                const EMPLOYEE_ID = urlToID(HREF)

                if (groups && groups.length > 0) {
                    for (const group of groups) {
                        response = await client.addGroupMember(group, EMPLOYEE_ID)
                    }
                }

                response = await client.getAccount(EMPLOYEE_ID)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)

                logger.info(account)
                res.send(account)
            }
        )
        .stdAccountUpdate(
            async (context: Context, input: StdAccountUpdateInput, res: Response<StdAccountUpdateOutput>) => {
                logger.info(input)
                if (input.changes) {
                    let response: AxiosResponse
                    for (const change of input.changes) {
                        const employee: any = {}
                        switch (change.attribute) {
                            case 'GROUPS':
                                if (change.op === AttributeChangeOp.Remove) {
                                    response = await client.removeGroupMember(change.value, input.identity)
                                } else {
                                    response = await client.addGroupMember(change.value, input.identity)
                                }
                                break
                            case 'PROFIL_ID':
                                if (change.op === AttributeChangeOp.Remove) {
                                    employee.PROFIL_ID = ''
                                    employee.EMPLOYEE_ID = input.identity
                                } else {
                                    employee.PROFIL_ID = change.value
                                    employee.EMPLOYEE_ID = input.identity
                                }
                                response = await client.updateAccount(input.identity, employee)
                                break
                            default:
                                employee[change.attribute] = change.value

                                response = await client.updateAccount(input.identity, employee)
                                break
                        }
                    }
                    //Need to investigate about std:account:update operations without changes but adding this for the moment
                } else if ('attributes' in input) {
                    logger.warn(
                        'No changes detected in account update. Please report unless you used attribute sync which is not supported.'
                    )
                }

                const response = await client.getAccount(input.identity)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)

                logger.info(account)
                res.send(account)
            }
        )
        .stdAccountDisable(
            async (context: Context, input: StdAccountDisableInput, res: Response<StdAccountDisableOutput>) => {
                logger.info(input)
                const today = new Date()
                const yesterday = subDays(today, 1)
                const date = format(yesterday, INPUT_DATE_FORMAT)

                const employee = {
                    END_OF_CONTRACT: date,
                }

                let response = await client.updateAccount(input.identity, employee)

                response = await client.getAccount(input.identity)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)

                logger.info(account)
                res.send(account)
            }
        )
        .stdAccountEnable(
            async (context: Context, input: StdAccountEnableInput, res: Response<StdAccountEnableOutput>) => {
                logger.info(input)
                const employee = {
                    END_OF_CONTRACT: '',
                }

                let response = await client.updateAccount(input.identity, employee)

                response = await client.getAccount(input.identity)

                const rawAccount = response.data
                const account = await buildAccount(rawAccount)

                logger.info(account)
                res.send(account)
            }
        )
        .stdEntitlementList(
            async (context: Context, input: StdEntitlementListInput, res: Response<StdEntitlementListOutput>) => {
                logger.info(input)
                const response = await client.listGroups()

                for (const rawGroup of response.data.records) {
                    const group = new Group(rawGroup, config.language)
                    logger.info(group)
                    res.send(group)
                }
            }
        )
        .stdEntitlementRead(
            async (context: Context, input: StdEntitlementReadInput, res: Response<StdEntitlementReadOutput>) => {
                logger.info(input)
                const response = await client.getGroup(input.identity)

                const account = new Group(response, config.language)
                logger.info(account)
                res.send(account)
            }
        )
}
