"""Check the actual job conditions without dispatching or deploying anything."""
import ast, pathlib, re

workflow=(pathlib.Path(__file__).resolve().parents[2]/'.github/workflows/deploy.yml').read_text(encoding='utf-8')

def condition(job):
    block=re.search(r'^  '+job+r':\n(.*?)(?=^  \w+:|\Z)',workflow,re.M|re.S).group(1)
    expression=re.search(r'^    if: (.+)$',block,re.M).group(1)
    return ast.parse(expression.replace('&&',' and ').replace('||',' or '),mode='eval').body

def evaluate(node,context):
    if isinstance(node,ast.Constant): return node.value
    if isinstance(node,ast.Attribute) and isinstance(node.value,ast.Name) and node.value.id=='github': return context[node.attr]
    if isinstance(node,ast.BoolOp):
        values=[evaluate(v,context) for v in node.values]
        if isinstance(node.op,ast.And): return all(values)
        if isinstance(node.op,ast.Or): return any(values)
    if isinstance(node,ast.Compare) and len(node.ops)==1:
        left,right=evaluate(node.left,context),evaluate(node.comparators[0],context)
        if isinstance(node.ops[0],ast.Eq): return left==right
        if isinstance(node.ops[0],ast.NotEq): return left!=right
    raise AssertionError('Unsupported job condition: '+ast.dump(node))

deploy=condition('deploy');preview=condition('preview')
for event,ref,head,expected_deploy,expected_preview in [
    ('push','refs/heads/main','',True,False),
    ('workflow_dispatch','refs/heads/main','',True,False),
    ('workflow_dispatch','refs/heads/refactor/split-app-modules','',False,False),
    ('workflow_dispatch','refs/heads/other-work','',False,False),
    ('workflow_dispatch','refs/tags/main','',False,False),
    ('push','refs/heads/other-work','',False,False),
    ('pull_request','refs/pull/6/merge','refactor/split-app-modules',False,False),
    ('pull_request','refs/pull/7/merge','other-work',False,True),
]:
    context=dict(event_name=event,ref=ref,head_ref=head)
    assert evaluate(deploy,context)==expected_deploy,('deploy',context)
    assert evaluate(preview,context)==expected_preview,('preview',context)
    print('PASS deployment conditions:',event,ref,head)
print('ALL PASS')
