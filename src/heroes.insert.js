'use strict';

const uuid = require('uuid')
const Joi = require('@hapi/joi')
const decoratorValidator = require('./utils/decoratorValidator')
const globalEnum = require('../src/utils/globalEnum')

class Handler {
  constructor({ dynamoDbSvc }) {
    this.dynamoDbSvc = dynamoDbSvc
    this.dynamodbTable = process.env.DYNAMODB_TABLE
  }

  static validator() {
    return Joi.object({
      nome: Joi.string().max(100).min(2).required(),
      poder: Joi.string().max(20).required()
    })
  }

  prepareData(data) {
    const params = {
      TableName: this.dynamodbTable,
      Item: {
        ...data,
        id: uuid.v4(),
        createdAt: new Date().toISOString()
      }

    }
    return params
  }

  async insertData(params) {
    return this.dynamoDbSvc.put(params).promise()
  }

  handleSuccess(data) {
    const response = {
      statusCode: 200,
      body: JSON.stringify(data)
    }
    return response
  }

  handleError(data) {
    const response = {
      statusCode: data.statusCode || 501,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t create item'
    }
    return response
  }

  async main(event) {
    try {
      // decorator modifica o body e ja retorna formato JSON
      const data = event.body
      const dbParams = this.prepareData(data)
      await this.insertData(dbParams)

      return this.handleSuccess(dbParams.Item)
    }
    catch (error) {
      console.error('Ops something is wrong!', error.stack)
      return this.handleError({ statusCode: 500 })
    }
  }
}

const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient()
const handler = new Handler({
  dynamoDbSvc: dynamoDB
})
module.exports = decoratorValidator(
  handler.main.bind(handler),
  Handler.validator(),
  globalEnum.ARG_TYPE.BODY
)