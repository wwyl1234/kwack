from apscheduler.schedulers.blocking import BlockingScheduler
import requests

def scheduled_job():
    print('This job runs everyday at 11pm.')
    req = requests.post('https://kwack-app.herokuapp.com/replenish')
    print(req.status_code)
    

if __name__ == "__main__":
    sched = BlockingScheduler()
    sched.add_job(scheduled_job, 'cron', id='scheduled_job', hour=23)

    try:
        sched.start()
    except (KeyboardInterrupt, SystemExit):
        pass
