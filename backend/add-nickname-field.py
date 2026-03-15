#!/usr/bin/env python3
"""
在 VPS 上运行此脚本，为 users 集合添加 nickname 字段。
用法：python3 add-nickname-field.py
"""
import urllib.request, urllib.parse, json, os, getpass

BASE = 'http://172.17.0.1:8091'

# 1. 管理员登录
admin_email = input('Admin email: ')
admin_pass  = getpass.getpass('Admin password: ')

req = urllib.request.Request(
    f'{BASE}/api/admins/auth-with-password',
    data=json.dumps({'identity': admin_email, 'password': admin_pass}).encode(),
    headers={'Content-Type': 'application/json'},
    method='POST',
)
resp = json.loads(urllib.request.urlopen(req).read())
token = resp['token']
headers = {'Authorization': token, 'Content-Type': 'application/json'}

# 2. 获取 users 集合的当前 schema
req = urllib.request.Request(f'{BASE}/api/collections/users', headers=headers)
coll = json.loads(urllib.request.urlopen(req).read())

# 3. 检查是否已有 nickname 字段
existing = [f['name'] for f in coll.get('schema', [])]
if 'nickname' in existing:
    print('nickname 字段已存在，无需重复添加。')
    exit(0)

# 4. 追加 nickname 字段
coll['schema'].append({
    'name': 'nickname',
    'type': 'text',
    'required': False,
    'options': {'min': None, 'max': 30, 'pattern': ''},
})

# 5. 更新集合
data = json.dumps(coll).encode()
req = urllib.request.Request(
    f'{BASE}/api/collections/{coll["id"]}',
    data=data,
    headers=headers,
    method='PATCH',
)
result = json.loads(urllib.request.urlopen(req).read())
print('完成！users 集合现已包含 nickname 字段。')
