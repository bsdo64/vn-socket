const io = require('../index').io;
const cookieParser = require('cookie-parser');
const Cookie = require('cookie');
const M = require('vn-api-model');
const Db = M.Post.Db;
const co = require('co');
const CronJob = require('cron').CronJob;

const Venalink = io.of('/venalink');

class VenalinkActivate {
  constructor() {
    this.venalinkTimer = [];
  }

  init() {
    const self = this;

    return co(function* () {
      const venalinks = yield Db.tc_venalinks.query();

      let active = [], terminated = [];
      for (let key in venalinks) {
        if (venalinks[key].is_activate) {
          // Activate

          if (venalinks[key].terminate_at > new Date()) {
            // Activate

            if (venalinks[key].total_remain_r > 0) {
              // Active

              active.push(venalinks[key].id);
              self.venalinkTimer.push({
                key: venalinks[key].id,
                timer: new CronJob(venalinks[key].terminate_at, function() {
                    Db.tc_venalinks.query().patch({is_activate: false}).where({id: venalinks[key].id});
                  },
                  function () {
                    self.venalinkTimer = self.venalinkTimer.filter(v => v.key !== venalinks[key].id)
                  },
                  true /* Start the job right now */
                )
              })

            } else {
              // Terminate

              terminated.push(venalinks[key].id);

            }
          } else {
            // Terminate

            terminated.push(venalinks[key].id);
          }
        } else {
          // Terminate

          terminated.push(venalinks[key].id);
        }
      }

      console.log(self.venalinkTimer);

      yield Db.tc_venalinks.query().patch({is_activate: false}).whereIn('id', terminated);

      const terminatedVenalinks = yield Db.tc_venalinks.query().whereIn('id', terminated);
      for (let key in terminatedVenalinks) {

        if (terminatedVenalinks[key].total_refunded_r !== terminatedVenalinks[key].total_remain_r) {

          let trade = yield Db
            .tc_trades
            .query()
            .insert({
              action: 'refundVenalink',
              sender_type: 'venacle',
              sender_id: null,
              target_type: 'venalink',
              target_id: terminatedVenalinks[key].id,
              receiver_type: 'user',
              receiver_id: terminatedVenalinks[key].user_id,
              amount_r: terminatedVenalinks[key].total_remain_r,
              amount_t: 0,
              created_at: new Date()
            });

          let beforeAccount = yield Db
            .tc_user_point_accounts
            .query()
            .where({
              user_id: terminatedVenalinks[key].user_id
            })
            .orderBy('created_at', 'DESC')
            .first();

          let newAccount = yield Db
            .tc_user_point_accounts
            .query()
            .insert({
              type: 'deposit',
              point_type: 'RP',
              total_r: beforeAccount.total_r + trade.amount_r,
              total_t: beforeAccount.total_t + trade.amount_t,
              trade_id: trade.id,
              user_id: terminatedVenalinks[key].user_id,
              created_at: new Date()
            });

          let refundedVenalink = yield Db
            .tc_venalinks
            .query()
            .patch({
              total_refunded_r: trade.amount_r
            })
            .where({
              id: terminatedVenalinks[key].id
            });

          yield Db
            .tc_user_trendboxes
            .query()
            .patch({
              T: newAccount.total_t,
              R: newAccount.total_r,
            })
            .where({user_id: terminatedVenalinks[key].user_id});
        }
      }

    })
  }
}

const v = new VenalinkActivate();
v.init();

Venalink.on('connection', function (socket) {

  socket.on('add venalink cron job', function (result) {

    Venalink.emit('comment_write noti', result.notis);
  });

  socket.on('disconnect', function () {
    console.log('user disconnected in venalink socket');
  });
});

module.exports = Venalink;