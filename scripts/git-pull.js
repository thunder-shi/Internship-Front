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

function escapeCommitMessage(message) {
  return message.replace(/"/g, '\\"');
}

async function askRequired(rl, question) {
  while (true) {
    const answer = (await rl.question(question)).trim();
    if (answer) return answer;
    console.log('输入不能为空，请重新输入。');
  }
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

    const page = await askRequired(rl, '请输入修改页面: ');
    const content = await askRequired(rl, '请输入修改内容: ');

    const commitMessage = `[${page}]${content}`;
    console.log(`\n本次 commit message: ${commitMessage}`);

    run('git add -A');
    run(`git commit -m "${escapeCommitMessage(commitMessage)}"`);
    run(`git push origin ${branch}`);

    console.log('\n✅ push 完成');
  } catch (err) {
    console.error('\n❌ 执行失败');
    if (err instanceof Error && err.message) {
      console.error(err.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
