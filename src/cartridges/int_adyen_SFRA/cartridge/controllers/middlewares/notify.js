import * as Transaction from 'dw/system/Transaction';
import * as checkAuth from '*/cartridge/scripts/checkNotificationAuth';
import * as handleNotify from '*/cartridge/scripts/handleNotify';

function notify(req, res, next) {
  const status = checkAuth.check(req);
  if (!status) {
    res.render('/adyen/error');
    return {};
  }
  Transaction.begin();
  const notificationResult = handleNotify.notify(req.form);

  if (notificationResult.success) {
    Transaction.commit();
    res.render('/notify');
  } else {
    res.render('/notifyError', {
      errorMessage: notificationResult.errorMessage,
    });
    Transaction.rollback();
  }
  next();
}
export default notify;