# CLAUDE.md

## 角色设定

你是一名资深桌面应用架构师，专精于高性能图像处理软件的架构与实现。

## 技术栈

- Tauri v2（桌面框架，Rust 后端）
- React 19 + TypeScript（前端）
- TailwindCSS v4（样式）
- Zustand（状态管理）
- @tanstack/react-virtual（虚拟滚动）
- react-resizable-panels（可拖拽面板布局）
- rusqlite（本地 SQLite 持久化）
- jpeg-decoder（高性能 JPEG 直方图计算）
- pnpm（包管理）

## 已实现功能

1. 极速加载：大图目录快速扫描、13 种 RAW 格式识别、JPG/RAW 同名合并
2. 网格视图 + 胶片视图双模式、Tab 切换、虚拟滚动支撑万张级渲染
3. 单键快捷键打分（1-5 星级、6-9 颜色、X 待删、U 清除、0 清星级）
4. 右键上下文菜单：复制/粘贴标签、批量打标签
5. 撤销/重做：Ctrl+Z 撤销打分、Ctrl+Shift+Z 重做
6. 筛选：星级/颜色/待删，严格 AND 交集逻辑
7. 连拍自动分组：基于 EXIF 拍摄时间按 ≤1s 间隔合并
8. 胶片视图专业导航：可拖拽面板、高精度导航器白框、光标处精准缩放
9. 双图同步对比：Alt+点击进入、共享 viewport 像素级同步缩放平移
10. EXIF 信息：拍摄时间、相机型号、光圈、快门、ISO、焦距
11. 直方图：基于 jpeg-decoder 直接解码的快速 RGB+Luma 直方图
12. 系统回收站删除：Delete 键 + 二次确认
13. 本地文件导出：复制/移动、JPG/RAW 可选、系统文件选择器
14. 打分持久化：SQLite 300ms 防抖写入、切换文件夹自动保存
15. 工作区无缝切换：切换文件夹时自动保存旧数据并加载新数据库
16. 连拍组键盘导航：↑/↓ 组内翻页、角标实时更新
17. 网格视图二维方向键导航：Enter 打开大图

## 协作原则

- 分步骤进行，每次仅完成当前下发的具体任务
- 不提前编写后续功能代码
- 每一步确保可编译、无报错、逻辑严密
- 优先编辑现有文件，避免不必要的新建文件
- 代码不加注释，除非意图非显而易见
- 不引入任务未要求的抽象或重构

## 项目结构

```
src/
├── App.tsx                    # 主入口、全局键盘、扫描/删除/导出逻辑
├── types.ts                   # ImageGroup, ExifData, BurstGroup
├── components/
│   ├── GridView.tsx           # 网格视图（虚拟滚动、展平连拍）
│   ├── FilmstripView.tsx      # 胶片视图（面板布局、导航器、对比）
│   ├── Viewer.tsx             # 全屏大图查看器
│   ├── Toolbar.tsx            # 全局工具栏（筛选、导出、撤销）
│   ├── ThumbCard.tsx          # 网格卡片（选中、连拍角标、打分覆盖）
│   ├── ContextMenu.tsx        # 右键菜单（标签操作）
│   ├── ExifPanel.tsx          # EXIF 信息面板
│   ├── Histogram.tsx          # 直方图 Canvas 组件
│   ├── RatingOverlay.tsx      # 卡片/大图打分角标
│   ├── ConfirmDialog.tsx      # 二次确认弹窗
│   ├── ExportModal.tsx        # 导出设置弹窗
│   ├── Toast.tsx              # 底部提示
│   ├── DragOverlay.tsx        # 拖拽文件提示
│   └── LocalImage.tsx         # Tauri 本地文件转 URL
├── stores/
│   ├── ratingStore.ts         # 打分状态 + SQLite 持久化
│   ├── selectionStore.ts      # 选中状态
│   ├── filterStore.ts         # 筛选状态
│   ├── undoStore.ts           # 撤销/重做
│   ├── compareStore.ts        # 双图对比状态
│   └── activeKeyStore.ts      # 胶片当前图片 key
├── hooks/
│   ├── useFileDrop.ts         # 文件拖拽监听
│   ├── useHistogram.ts        # 直方图缓存 + 防抖
│   └── usePreload.ts          # 大图查看器预加载
└── utils/
    ├── groupBurstPhotos.ts    # 连拍分组算法
    └── filterImages.ts        # 筛选过滤算法

src-tauri/src/
├── lib.rs                     # 命令注册
├── scan.rs                    # 目录扫描 + 自然排序
├── exif.rs                    # EXIF 解析
├── trash.rs                   # 系统回收站
├── export.rs                  # 文件导出
├── db.rs                      # SQLite 打分持久化
└── histogram.rs               # 直方图计算（jpeg-decoder 快速通道）
```
