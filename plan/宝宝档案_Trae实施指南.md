# 宝宝档案页 — Trae 分步实施 Prompt

> 请结合 `plan/宝宝档案页设计规范.md` 和设计稿截图 (`plan/design_profile_create.png`、`plan/design_profile_view.png`) 执行。
> 每一步完成并验证后再进入下一步。

---

## 第 1 步：类型定义 + API 函数

**新建文件**: `src/types/baby.ts`
**修改文件**: `src/utils/api.ts`

```
请完成以下两件事：

1. 新建 src/types/baby.ts，定义 Baby 接口：

interface Baby {
  id: string
  name: string
  birthday: string           // YYYY-MM-DD
  gender: 'male' | 'female'
  birthWeight?: number       // kg
  birthHeight?: number       // cm
  bloodType?: 'A' | 'B' | 'AB' | 'O' | 'unknown'
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

导出 Baby 类型和 BloodType 联合类型。

2. 在 src/utils/api.ts 末尾追加宝宝档案相关的 API 函数（不要改动已有代码）：

- createBaby(data: Partial<Baby>): Promise<Baby>
  POST ${API_BASE_URL}/babies，body 为 { name, birthday, gender, birthWeight, birthHeight, userId: DEFAULT_USER_ID }

- getBaby(id: string): Promise<Baby>
  GET ${API_BASE_URL}/babies/${id}

- updateBaby(id: string, data: Partial<Baby>): Promise<Baby>
  PUT ${API_BASE_URL}/babies/${id}

- getBabies(): Promise<Baby[]>
  GET ${API_BASE_URL}/babies?userId=${DEFAULT_USER_ID}

所有函数需要处理错误，失败时 console.error 并 throw。
导入 Baby 类型从 @/types/baby。

请参考 plan/宝宝档案页设计规范.md 第五节 API 接口。
```

---

## 第 2 步：Pinia Store

**新建文件**: `src/stores/baby.ts`

```
请新建 src/stores/baby.ts，使用 Pinia defineStore 创建 useBabyStore。

参考现有的 src/stores/records.ts 的代码风格（Composition API 写法）。

Store 内容：

const baby = ref<Baby | null>(null)
const isLoading = ref(false)

// 从 localStorage 初始化
const saved = localStorage.getItem('baby_profile')
if (saved) {
  try { baby.value = JSON.parse(saved) } catch { baby.value = null }
}

// 计算属性
const hasProfile = computed(() => !!baby.value)

const ageInDays = computed(() => {
  if (!baby.value) return 0
  const birth = new Date(`${baby.value.birthday}T00:00:00+08:00`)
  const now = new Date()
  return Math.floor((now.getTime() - birth.getTime()) / 86400000)
})

const ageText = computed(() => {
  const days = ageInDays.value
  if (days < 30) return `${days}天`
  const months = Math.floor(days / 30)
  const remainDays = days % 30
  if (months < 12) return remainDays > 0 ? `${months}个月${remainDays}天` : `${months}个月`
  const years = Math.floor(months / 12)
  const remainMonths = months % 12
  return remainMonths > 0 ? `${years}岁${remainMonths}个月` : `${years}岁`
})

// 方法
const saveToLocal = () => {
  if (baby.value) {
    localStorage.setItem('baby_profile', JSON.stringify(baby.value))
  } else {
    localStorage.removeItem('baby_profile')
  }
}

const loadBaby = async () => {
  isLoading.value = true
  try {
    const list = await getBabies()
    if (list.length > 0) {
      baby.value = list[0]
      saveToLocal()
    }
  } catch (e) {
    console.error('加载宝宝档案失败', e)
  } finally {
    isLoading.value = false
  }
}

const createBaby = async (data: Partial<Baby>) => {
  isLoading.value = true
  try {
    const result = await createBabyApi(data)
    baby.value = result
    saveToLocal()
    return result
  } finally {
    isLoading.value = false
  }
}

const updateBaby = async (data: Partial<Baby>) => {
  if (!baby.value) return
  isLoading.value = true
  try {
    const result = await updateBabyApi(baby.value.id, data)
    baby.value = result
    saveToLocal()
    return result
  } finally {
    isLoading.value = false
  }
}

return {
  baby, hasProfile, ageInDays, ageText, isLoading,
  loadBaby, createBaby, updateBaby
}

导入 getBabies, createBaby (rename 为 createBabyApi), updateBaby (rename 为 updateBabyApi) 从 @/utils/api。
导入 Baby 从 @/types/baby。

请先做这一步，我确认后再继续。
```

---

## 第 3 步：宝宝档案创建页

**新建文件**: `src/views/ProfileCreate.vue`

```
请新建 src/views/ProfileCreate.vue，实现宝宝档案创建页。

参考设计稿: plan/design_profile_create.png
参考设计规范: plan/宝宝档案页设计规范.md 第二节

页面结构（从上到下）：

1. 顶部导航栏：
   - 左侧: lucide ChevronLeft 返回按钮，点击 router.back()
   - 居中: "创建宝宝档案"，17px semibold

2. 头像上传区（居中）：
   - 88×88px 圆形容器，2px dashed #E65100 边框
   - 无照片时: bg #FFE0CC，lucide Camera 图标 32px #E65100
   - 有照片时: img cover，右上角叠加一个编辑小图标
   - 下方文字 "点击添加头像"，13px #999
   - 点击弹出 van-action-sheet: [拍照, 从相册选择]
   - 暂时只实现"从相册选择"：用 input[type=file] accept="image/*" 实现

3. 表单卡片（白色圆角 20px，padding 20px，shadow）：

   - 宝宝昵称（必填）：
     label "宝宝昵称" 13px #999
     input 占位 "给宝宝起个昵称吧"，44px高，底部边框

   - 出生日期（必填）：
     label "出生日期" 13px #999
     点击区域显示 "请选择出生日期" + 右侧 lucide Calendar 图标 20px #E65100
     点击弹出 van-popup + van-date-picker（参考 Stats.vue 中已有的日期选择器写法）
     选择后格式化为 "YYYY年M月D日" 显示

   - 性别（必填）：
     label "性别" 13px #999
     两个按钮并排，gap 12px，各 50% 宽
     男孩: lucide Baby 图标 + "男孩"文字，选中时 bg #E3F2FD, border #1565C0
     女孩: lucide Heart 图标 + "女孩"文字，选中时 bg #FCE4EC, border #C62828
     未选中: bg #FFF, border 1px #E0E0E0, 圆角 12px

   - 出生体重（选填）：
     label "出生体重" + 灰色 "(选填)"
     input type number，placeholder 右侧 "kg"，step 0.01

   - 出生身高（选填）：
     label "出生身高" + 灰色 "(选填)"
     input type number，placeholder 右侧 "cm"，step 0.1

4. 提交按钮：
   全宽，48px高，圆角 16px
   bg linear-gradient(135deg, #FF9A56, #E65100)
   文字 "开始记录" 16px bold 白色
   shadow 0 4px 16px rgba(230,81,0,0.25)
   禁用态: 昵称或出生日期未填时 opacity 0.5 + pointer-events-none
   点击: 调用 babyStore.createBaby()，成功后 router.push('/') + showToast("宝宝档案创建成功")

5. 底部引导文案：
   "创建后即可开始记录宝宝的每一天"，12px #CCC，居中

整体: min-h-screen, bg var(--bg-color), px-5, pt-5
```

---

## 第 4 步：宝宝档案查看/编辑页

**新建文件**: `src/views/Profile.vue`

```
请新建 src/views/Profile.vue，实现宝宝档案查看/编辑页。

参考设计稿: plan/design_profile_view.png
参考设计规范: plan/宝宝档案页设计规范.md 第三节

页面有两种模式，通过 ref(isEditing) 切换。

=== 查看模式 (isEditing = false) ===

1. 顶部导航栏：
   - 左侧: lucide ChevronLeft，点击 router.back()（如果是从首页来的则 router.push('/')）
   - 居中: "宝宝档案"，17px semibold
   - 右侧: lucide Pencil 编辑图标 20px #E65100，点击 isEditing = true

2. Hero 区域（居中）：
   - 头像: 80×80px 圆形，border 3px #FFF，shadow
     无照片时: bg #FFE0CC，lucide Baby 36px #E65100
   - 昵称: 20px bold #2D2D2D，margin-top 12px
   - 天数标签: inline pill，bg #E65100，text 白色 12px bold，padding 3px 12px，圆角 12px
     内容: babyStore.ageInDays + "天"
   - 副标题: 13px #999，margin-top 4px
     内容: "{男孩/女孩} · {YYYY}年{M}月{D}日出生"

3. 三列数据卡片（flex, gap 10px）：
   每张: flex-1, bg #FFF, 圆角 16px, padding 12px, shadow
   - 卡片1: lucide Calendar 18px #E65100 + "{N}天" 18px bold + "出生天数" 11px #999
   - 卡片2: lucide Scale 18px #E65100 + "--kg" 18px bold + "最近体重" 11px #999
     (暂时显示 "--"，后续接入生长曲线)
   - 卡片3: lucide Milk 18px #E65100 + 今日奶量 + "今日奶量" 11px #999
     (调用 fetchDailyStats 获取，加载失败显示 "--")

4. 基本信息卡片：
   白色圆角 20px, padding 16px, shadow
   标题行: 左侧竖线 3×14px bg #FF9A56 + "基本信息" 15px semibold
   信息行 (每行 flex justify-between, padding 12px 0, border-bottom 1px #F5F5F5, 最后一行无border):
   - 出生日期 → "YYYY年M月D日"
   - 性别 → "男孩"/"女孩" + 色圆点 (男蓝8px #1565C0 / 女粉8px #C62828)
   - 出生体重 → "{X.XX} kg" 或 "未填写"(#CCC italic)
   - 出生身高 → "{XX.X} cm" 或 "未填写"
   - 血型 → 值 或 "未填写"

5. 快捷操作卡片：
   白色圆角 20px, padding 16px, shadow
   标题行: 同上
   操作行 (每行 flex align-center, padding 14px 0, border-bottom, 最后一行无):
   - 左侧: lucide 图标 20px #E65100 + 文字 15px #333, gap 10px
   - 右侧: lucide ChevronRight 16px #CCC
   - 编辑档案 (lucide Pencil) → isEditing = true
   - 家庭共享 (lucide Users) + "即将开放"标签(12px #CCC) → showToast("即将开放")
   - 导出数据 (lucide Download) + "即将开放"标签 → showToast("即将开放")

=== 编辑模式 (isEditing = true) ===

1. 顶部导航栏变化：
   - 左侧: lucide X (关闭)，点击取消编辑 (isEditing = false, 恢复原值)
   - 居中: "编辑档案"
   - 右侧: "保存" 文字按钮，16px bold #E65100，点击保存

2. Hero 区变为可编辑：
   - 头像可点击（叠加半透明 + Camera 图标）
   - 昵称变为输入框
   - 性别变为两个选择按钮

3. 基本信息变为表单字段：
   - 出生日期 → 可点击弹出 date-picker
   - 出生体重 → number input
   - 出生身高 → number input
   - 血型 → 新增字段，van-action-sheet 选择 [A, B, AB, O, 不确定]

4. 保存逻辑：
   调用 babyStore.updateBaby(editData)
   成功后 isEditing = false + showToast("档案已更新")

整体: min-h-[calc(100vh-50px)], bg var(--bg-color), px-5, pt-5, pb-6
```

---

## 第 5 步：路由 + 路由守卫 + Tabbar 控制

**修改文件**: `src/router/index.ts`, `src/App.vue`

```
请完成以下修改：

1. src/router/index.ts — 新增两个路由：

新增导入:
  import Profile from '@/views/Profile.vue'
  import ProfileCreate from '@/views/ProfileCreate.vue'

新增路由:
  { path: '/profile', name: 'profile', component: Profile }
  { path: '/profile/create', name: 'profileCreate', component: ProfileCreate }

2. src/App.vue — 两处修改：

a) 路由守卫：在 <script setup> 中新增 router.beforeEach 逻辑：

import { useBabyStore } from '@/stores/baby'
const babyStore = useBabyStore()

// 应用启动时尝试从后端加载宝宝档案
await babyStore.loadBaby()

router.beforeEach((to) => {
  // 没有宝宝档案 且 不在创建页 → 重定向到创建页
  if (!babyStore.hasProfile && to.path !== '/profile/create') {
    return { path: '/profile/create' }
  }
  // 已有档案 且 在创建页 → 重定向到首页
  if (babyStore.hasProfile && to.path === '/profile/create') {
    return { path: '/' }
  }
})

注意: router 需要从 vue-router 导入: import router from '@/router'

b) Tabbar 显隐控制：
在 /profile 和 /profile/create 页面时隐藏底部 tabbar。

修改 van-tabbar，加 v-show 条件：
  <van-tabbar v-show="showTabbar" ...>

新增计算属性：
  const showTabbar = computed(() => {
    return !['/profile', '/profile/create'].includes(route.path)
  })

c) active tab 计算需要排除 profile 路由的影响（保持现有逻辑不变即可，因为 profile 路由不在 tab 列表中）。

请先做这一步，确认路由跳转正常后再继续。
```

---

## 第 6 步：集成到现有页面

**修改文件**: `src/views/home.vue`, `src/utils/api.ts`

```
请完成以下集成修改：

1. src/views/home.vue — 右上角头像联动宝宝档案：

当前代码 (约第 152-155 行):
  <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--formula-icon-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
    <User :size="18" color="var(--brand-primary)" />
  </div>

改为:
  - 导入 useBabyStore
  - 如果 babyStore.baby 存在:
    · 有 avatarUrl → 显示 <img> 头像
    · 无 avatarUrl → 显示宝宝昵称首字（取第一个字），16px bold #E65100，bg #FFE0CC
  - 如果 babyStore.baby 不存在 → 保持原来的 User 图标
  - 点击事件: router.push('/profile')（原来是纯装饰，现在变为可点击导航）

2. src/utils/api.ts — 动态获取 babyId：

当前 DEFAULT_BABY_ID 是硬编码的。修改为：
  - 保留 DEFAULT_BABY_ID 作为 fallback
  - 新增函数 getBabyId(): string {
      const saved = localStorage.getItem('baby_profile')
      if (saved) {
        try { return JSON.parse(saved).id } catch { /* fallback */ }
      }
      return DEFAULT_BABY_ID
    }
  - 将 submitRecord, fetchDailyStats, fetchDailyRecords 中的 DEFAULT_BABY_ID 替换为 getBabyId()

这样当宝宝档案创建后，所有 API 调用会自动使用真实的 babyId。

完成后在浏览器中测试完整流程：
  1. 首次打开 → 自动跳转创建页
  2. 填写信息 → 创建 → 跳转首页
  3. 首页右上角显示宝宝昵称首字
  4. 点击右上角 → 进入档案查看页
  5. 记录数据 → 统计页正常显示

参考 plan/宝宝档案页设计规范.md 第七节集成点。
```

---

## 使用提醒

1. **每一步完成后务必在浏览器中目视检查**，确认无误再进入下一步。
2. **设计稿截图在 `plan/` 目录**，可以在 Trae 对话中附加图片让 AI 对照实现。
3. 如果某一步效果不理想，**在当前步骤追加修正指令**，不要跳到下一步。
4. `plan/宝宝档案页设计规范.md` 始终保留在项目根目录，Trae 会自动读取 `.trae/rules/design-rules.md` 中的设计规范。
