import BaseException from '#exceptions/base_exception'

export default class BadGatewayException extends BaseException {
  static status = 502
}
