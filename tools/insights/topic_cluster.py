import json
import os
import re
from pathlib import Path

import numpy as np
import requests
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

load_dotenv()

SUPABASE_URL = os.environ['SUPABASE_URL'].rstrip('/')
SERVICE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']


def rest_get(path: str, params: dict):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f"Bearer {SERVICE_KEY}"
    }
    r = requests.get(url, headers=headers, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def compact(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--session-id', required=True)
    ap.add_argument('--k', type=int, default=5)
    ap.add_argument('--out', default=None)
    args = ap.parse_args()

    session_id = args.session_id

    questions = rest_get('questions', {
        'select': 'id,body,status',
        'session_id': f"eq.{session_id}",
        'order': 'created_at.asc'
    })
    answers = rest_get('answers', {
        'select': 'question_id,body'
    })
    ans_by_q = {a['question_id']: a.get('body', '') for a in answers}

    transcripts = rest_get('session_transcripts', {
        'select': 'cleaned_text,raw_text',
        'session_id': f"eq.{session_id}",
        'limit': '1'
    })
    transcript_text = ''
    if transcripts:
        transcript_text = transcripts[0].get('cleaned_text') or transcripts[0].get('raw_text') or ''

    docs = []
    meta = []

    for q in questions:
        qtext = compact(q.get('body', ''))
        atext = compact(ans_by_q.get(q['id'], ''))
        if not qtext and not atext:
            continue
        docs.append(f"Q: {qtext}\nA: {atext}".strip())
        meta.append({'question_id': q['id'], 'status': q.get('status')})

    if transcript_text.strip():
        docs.append(compact(transcript_text))
        meta.append({'transcript': True})

    if len(docs) < 3:
        raise SystemExit('Not enough text to cluster. Add more Q/A or a transcript.')

    vec = TfidfVectorizer(stop_words='english', max_features=4000)
    X = vec.fit_transform(docs)

    k = min(args.k, max(2, len(docs) // 2))
    km = KMeans(n_clusters=k, n_init='auto', random_state=42)
    labels = km.fit_predict(X)

    terms = np.array(vec.get_feature_names_out())
    clusters = []
    for i in range(k):
        idx = np.where(labels == i)[0]
        center = km.cluster_centers_[i]
        top = terms[np.argsort(center)[-10:]][::-1].tolist()
        clusters.append({
            'cluster': int(i),
            'top_terms': top,
            'items': [{'meta': meta[j], 'text_preview': docs[j][:240]} for j in idx.tolist()]
        })

    out = args.out or f"artifacts/session_{session_id}_clusters.json"
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'session_id': session_id, 'k': k, 'clusters': clusters}, f, indent=2)

    print(f"Wrote {out}")


if __name__ == '__main__':
    main()
