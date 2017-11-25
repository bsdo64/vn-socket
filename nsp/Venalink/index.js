const io = require('../index').io;
const cookieParser = require('cookie-parser');
const Cookie = require('cookie');
const moment = require('moment');
const Db = require('vn-api-model').Db;

const co = require('co');
const CronJob = require('cron').CronJob;

const Venalink = io.of('/venalink');

class VenalinkActivate {
  constructor(socket) {
    this.venalinkTimer = [];
    this.socket = socket;
  }

  $refundTerminatedVenalink(venalink) {
    return co.call(this, function* () {

      yield Db.tc_venalinks.query().patch({is_activate: false}).where({ id: venalink.id });

      if (venalink.total_refunded_r !== venalink.total_remain_r) {

        let trade = yield Db
          .tc_trades
          .query()
          .insert({
            action: 'refundVenalink',
            sender_type: 'venacle',
            sender_id: null,
            target_type: 'venalink',
            target_id: venalink.id,
            receiver_type: 'user',
            receiver_id: venalink.user_id,
            amount_r: venalink.total_remain_r,
            amount_t: 0,
            created_at: new Date()
          });

        let beforeAccount = yield Db
          .tc_user_point_accounts
          .query()
          .where({
            user_id: venalink.user_id
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
            user_id: venalink.user_id,
            created_at: new Date()
          });

        let refundedVenalink = yield Db
          .tc_venalinks
          .query()
          .patchAndFetchById(venalink.id, {
            total_refunded_r: trade.amount_r
          });

        let trendbox = yield Db
          .tc_user_trendboxes
          .query()
          .patch({
            T: newAccount.total_t,
            R: newAccount.total_r,
          })
          .where({user_id: venalink.user_id});

        Venalink.emit('terminate venalink', {refundedVenalink, });
      }
    })
  }

  init() {
    const self = this;

    return co.call(this, function* () {
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
                venalink: venalinks[key],
                timer: new CronJob(moment().add(5, 'seconds').toDate()/*venalinks[key].terminate_at*/, () => {
                    this.$refundTerminatedVenalink(venalinks[key])
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

      const terminatedVenalinks = yield Db.tc_venalinks.query().whereIn('id', terminated);
      for (let key in terminatedVenalinks) {

        let venalink = terminatedVenalinks[key];

        this.$refundTerminatedVenalink(venalink);
      }

    }).catch(err => {
      console.log(err);
    })
  }

  printTimer(sec) {
    setInterval(() => {
      console.log('reserved venalink count: ' + this.venalinkTimer.length);
      const fastVenalink = this.venalinkTimer.sort(function (a, b) {
        return new Date(a.venalink.terminate_at) - new Date(b.venalink.terminate_at);
      })[0];
      if (fastVenalink) {
        console.log('Fastest from now: ', fastVenalink.venalink);
      }
    }, sec * 1000)
  }

  setNewVenalink(venalink) {
    const self = this;

    this.venalinkTimer.push({
      key: venalink.id,
      venalink: venalink,
      timer: new CronJob(new Date(venalink.terminate_at), () => {

        this.$refundTerminatedVenalink(venalink);
        this.venalinkTimer = this.venalinkTimer.filter(v => v.key !== venalink.id);

        },
        function () {
          self.venalinkTimer = self.venalinkTimer.filter(v => v.key !== venalink.id)
        },
        true /* Start the job right now */
      )
    })
  }
}


const v = new VenalinkActivate();
v.init();
v.printTimer(5);

Venalink.on('connection', function (socket) {

  socket.on('add venalink cron job', function (data) {

    v.setNewVenalink(data.venalink, socket);
  });

  socket.on('disconnect', function () {
    console.log('user disconnected in venalink socket');
  });
});

module.exports = Venalink;