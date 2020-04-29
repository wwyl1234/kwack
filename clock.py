from apscheduler.schedulers.blocking import BlockingScheduler
import requests

sched = BlockingScheduler()


@sched.scheduled_job('cron', hour=23)
def scheduled_job():
    req = requests.post('https://kwack-app.herokuapp.com/replenish')
    print(req.status_code)
    print('This job is run everyday at 11pm.')

sched.start()
