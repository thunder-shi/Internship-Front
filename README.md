# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

以下是前端请求JSON的查询条件编写方式：

  查询操作符

  | 操作符 | 符号 | 说明         |
  |--------|------|--------------|
  | EQ     | =    | 等于         |
  | NE     | !=   | 不等于       |
  | LIKE   | ≈    | 模糊查询     |
  | IN     | ()   | 包含于(多值) |
  | NOT_IN | !()  | 不包含于     |
  | GT     | >    | 大于         |
  | LT     | <    | 小于         |
  | GE     | >=   | 大于等于     |
  | LE     | <=   | 小于等于     |
  | RANGE  | <=>  | 范围查询     |

  请求JSON结构示例

  1. 精确匹配 (name 等于某值)

  {
    "listKeyWords": "MainInternship",
    "searchKey": {
      "name": "软件实习"
    },
    "regKey": {
      "name": "="
    },
    "pageInfo": { "page": 1, "size": 25 }
  }

  2. 不等于 (name 不能是某值)

  {
    "listKeyWords": "MainInternship",
    "searchKey": {
      "name": "测试项目"
    },
    "regKey": {
      "name": "!="
    }
  }

  3. 模糊查询 (name 包含某关键词)

  {
    "searchKey": {
      "name": "软件"
    },
    "regKey": {
      "name": "≈"
    }
  }

  4. IN查询 (name 在多个值中)

  {
    "searchKey": {
      "internshipTypeId": "1,2,3"
    },
    "regKey": {
      "internshipTypeId": "()"
    }
  }

  5. NOT IN查询 (排除多个值)

  {
    "searchKey": {
      "internshipTypeId": "1,2"
    },
    "regKey": {
      "internshipTypeId": "!()"
    }
  }

  6. 组合条件 (多字段AND)

  {
    "searchKey": {
      "name": "实习",
      "studentNum": "10"
    },
    "regKey": {
      "name": "≈",
      "studentNum": ">"
    }
  }

  7. OR逻辑 (用 andor 控制)

  {
    "searchKey": {
      "internshipTypeId": "1",
      "creatorId": "5"
    },
    "andor": {
      "internshipTypeId": false,
      "creatorId": false
    }
  }
  andor 中 false 表示 OR 逻辑，true 或不设置表示 AND 逻辑
