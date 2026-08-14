import BaseException from '#exceptions/base_exception'

export default class ServiceUnavailableException extends BaseException {
  static status = 503
}
