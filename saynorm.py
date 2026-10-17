import re
_U={'k':'thousand','K':'thousand','m':'million','M':'million','b':'billion','B':'billion'}
def norm(s):
    def f(m):
        num=m.group(1).rstrip('.,'); tail=m.group(1)[len(num):]; unit=(m.group(2) or '').strip()
        unit=_U.get(unit,unit)
        return f"{num} {unit+' ' if unit else ''}dollars{tail}"
    return re.sub(r'\$\s?([\d][\d,]*(?:\.\d+)?[.,]?)(\s?(?:million|billion|thousand|[kKmMbB])\b)?', f, s)
if __name__=='__main__':
    for t in ["You'll have about $400,000 in proceeds.","about $1.2 million. At the integrated one, about $1.6 million.","about $332,000 for the first","$2,083 a month","a $3 billion case","$100K pledged","$216,000."]:print(norm(t))
