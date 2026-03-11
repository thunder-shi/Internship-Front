import { execSync } from 'child_process';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function getOutput(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const branch = getOutput('git rev-parse --abbrev-ref HEAD');
    console.log(`当前分支: ${branch}`);

    run(`git pull origin ${branch}`);

    const status = getOutput('git status --porcelain');
    if (!status) {
      console.log('没有本地改动，无需提交。');
      return;
    }

    const message = await rl.question('请输入 commit 内容: ');
    if (!message.trim()) {
      console.log('commit 内容不能为空');
      process.exit(1);
    }

    run('git add -A');
    run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    run(`git push origin ${branch}`);

    console.log('\n✅ push 完成');
  } catch (err) {
    console.error('\n❌ 执行失败');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
