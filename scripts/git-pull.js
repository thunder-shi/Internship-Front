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
    const targetBranch = await askRequired(rl, '请输入要合并到的分支名: ');

    const status = getOutput('git status --porcelain');
    if (status) {
      console.log('\n❌ 当前工作区有未提交改动，请先提交或暂存后再执行。');
      process.exit(1);
    }

    const currentBranch = getOutput('git rev-parse --abbrev-ref HEAD');
    console.log(`当前分支: ${currentBranch}`);
    console.log(`目标分支: ${targetBranch}`);

    run('git checkout main');

    // pull 前的 commit
    const beforePull = getOutput('git rev-parse HEAD');

    run('git pull origin main');

    // pull 后的 commit
    const afterPull = getOutput('git rev-parse HEAD');

    if (beforePull === afterPull) {
      console.log('\n⚠️ main 分支没有新的更新');

      run(`git checkout ${targetBranch}`);
      console.log(`\n已切换到目标分支: ${targetBranch}`);
      return;
    }

    console.log('\n✅ main 有更新，开始合并');

    run(`git checkout ${targetBranch}`);
    run(`git pull origin ${targetBranch}`);

    try {
      run('git merge main');
    } catch (err) {
      console.log('\n❌ merge 时发生冲突，请手动解决冲突后再提交。');
      process.exit(1);
    }

    run(`git push origin ${targetBranch}`);

    console.log('\n✅ main 最新代码已成功合并并推送到目标分支');
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
