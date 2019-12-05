__all__ = ["days_ago", "short_isotime", "isodate"]

from datetime import datetime, timedelta, date


def gen_analysis_key(start, end):
    if not isinstance(start, date):
        start = datetime.strptime(start, "%Y-%m-%d")
    if not isinstance(end, date):
        end = datetime.strptime(end, "%Y-%m-%d")

    start = isodate(start)
    end = isodate(end)

    return 's{}e{}'.format(start, end)


def days_ago(days):
    return datetime.utcnow() - timedelta(days=days)


def short_isotime(dt):
    return dt.isoformat().split('.')[0]


def isodate(dt):
    return dt.isoformat().split('T')[0]
