# C++ 优先队列（priority_queue）入门

优先队列是一种**每次都能取出当前优先级最高的元素**的数据结构。在 C++ 中，通常使用 `priority_queue` 实现。

普通队列按照进入的先后顺序取出元素；优先队列按照指定的比较规则取出元素。

本文先介绍基本操作，再讲解大小根堆、结构体比较和常见应用。完整程序沿用竞赛模板，并在关键操作旁添加中文注释。

## 一、优先队列与普通队列的区别

假设依次插入 `3、1、5、2`，且插入结束后才开始取出：

| 数据结构 | 取出规则 | 取出顺序 |
| --- | --- | --- |
| `queue<int>` | 先进先出 | `3 1 5 2` |
| 默认 `priority_queue<int>` | 当前最大值优先 | `5 3 2 1` |
| 小根堆优先队列 | 当前最小值优先 | `1 2 3 5` |

优先队列可以在插入和取出之间交替操作。每次访问堆顶，得到的都是**此时仍在队列中的元素**里的最高优先级元素。

例如：先插入 `3、5`，取出 `5`，再插入 `10`，下一次取出的就是 `10`。

## 二、大小根堆的定义

优先队列通常通过**二叉堆**维护元素。堆顶就是优先级最高的元素。

- **大根堆**：堆顶是最大值。
- **小根堆**：堆顶是最小值。

标准头文件为 `<queue>`；使用下面的小根堆定义时，还会用到 `<vector>` 和 `<functional>`。竞赛中也可以统一使用 `<bits/stdc++.h>`，但它不是标准 C++ 头文件。

### 1. 大根堆：默认写法

```cpp
priority_queue<int> q; // 堆顶是最大值
```

等价于：

```cpp
priority_queue<int, vector<int>, less<int>> q;
```

### 2. 小根堆

```cpp
priority_queue<int, vector<int>, greater<int>> q; // 堆顶是最小值
```

三个模板参数的含义：

| 参数 | 含义 |
| --- | --- |
| 第一个 `int` | 存储的元素类型 |
| `vector<int>` | 底层存储元素的容器类型 |
| `greater<int>` | 用来维护堆的比较规则 |

这里的 `vector<int>` 是类型，不是提前创建的变量；直接这样定义即可，不需要另写一个 `vector`。

可以先记住：

```text
less<int>     → 大根堆 → 最大值在堆顶
greater<int>  → 小根堆 → 最小值在堆顶
```

为什么比较符号与堆顶大小看起来相反，会在“自定义比较规则”中解释。

## 三、常用操作

| 操作 | 作用 | 时间复杂度 |
| --- | --- | --- |
| `q.push(x)` | 插入一个元素 | 通常记为摊还 O(log n) |
| `q.pop()` | 删除堆顶元素 | O(log n) |
| `q.top()` | 读取堆顶元素，不删除 | O(1) |
| `q.empty()` | 判断是否为空 | O(1) |
| `q.size()` | 获取当前元素个数 | O(1) |

其中 $n$ 为当前元素个数。堆调整需要 $O(\log n)$ 时间；默认底层容器是 `vector`，单次插入遇到扩容时可能搬移所有元素，因此 `push()` 的单次最坏时间不一定是 $O(\log n)$。

注意：

1. 调用 `top()` 和 `pop()` 前必须保证非空。
2. `pop()` 没有返回值，需要先读取、再删除。
3. `size()` 返回无符号整数类型。
4. 优先队列允许重复元素，插入两次同一个数，会保留两个元素。

```cpp
if (!q.empty()) {
    int x = q.top(); // 先保存堆顶
    q.pop(); // 再删除堆顶
    cout << x << endl;
}
```

不能写成：

```cpp
int x = q.pop(); // 错误：pop() 没有返回值
```

### 操作过程

以大根堆为例，下表只记录**剩余元素和堆顶**，不表示实际的底层排列。

| 操作 | 剩余元素（无序集合意义，保留重复次数） | 当前堆顶 |
| --- | --- | --- |
| `q.push(3)` | `3` | `3` |
| `q.push(1)` | `3、1` | `3` |
| `q.push(5)` | `3、1、5` | `5` |
| `q.top()` | `3、1、5` | `5`，队列不变 |
| `q.pop()` | `3、1` | `3` |
| `q.push(4)` | `3、1、4` | `4` |

## 四、完整示例：从大到小输出

输入 $n$ 个整数，全部插入大根堆，再反复读取和删除堆顶。

```cpp
#include <bits/stdc++.h>

using namespace std;

#define endl '\n'
#define int long long

const int N = 2e5 + 5;
const int MOD = 1e9 + 7;
const int INF = 0x3f3f3f3f3f3f3f3f;
const double PI = acos(-1.0);

void solve() {
    int n;
    cin >> n; // 读入元素个数

    priority_queue<int> q; // 默认大根堆，每次 solve() 重新创建
    for (int i = 1; i <= n; i++) {
        int x;
        cin >> x;
        q.push(x); // 插入 x，自动维护最大值在堆顶
    }

    while (!q.empty()) { // 先保证非空，才能访问堆顶
        cout << q.top() << " "; // 读取当前最大值
        q.pop(); // 删除刚输出的元素
    }
    cout << endl;
}

signed main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tt = 1;
    // cin>>tt;
    while (tt--) solve();
    return 0;
}

// ease2k // eAs1nGG-_- //
```

输入：

```text
5
3 1 5 2 5
```

输出（忽略行末空格）：

```text
5 5 3 2 1
```

代码讲解：

1. `q.push(x)` 负责插入，并调整堆。
2. 全部插入后，堆顶为 `5`。
3. 删除一个 `5` 后，另一个 `5` 仍然存在，所以下一次仍输出 `5`。
4. 每次删除当前最大值，最终得到从大到小的输出序列。

通过逐个插入再逐个弹出，时间复杂度为 $O(n\log n)$，额外空间复杂度为 $O(n)$。如果只需要对一组固定数据排序，通常直接使用 `sort()` 更方便。

## 五、完整示例：从小到大输出

只需要把定义改为小根堆，其余读取、插入和删除操作完全相同。

```cpp
#include <bits/stdc++.h>

using namespace std;

#define endl '\n'
#define int long long

const int N = 2e5 + 5;
const int MOD = 1e9 + 7;
const int INF = 0x3f3f3f3f3f3f3f3f;
const double PI = acos(-1.0);

void solve() {
    int n;
    cin >> n;

    priority_queue<int, vector<int>, greater<int>> q; // 小根堆
    for (int i = 1; i <= n; i++) {
        int x;
        cin >> x;
        q.push(x); // 插入后维护最小值在堆顶
    }

    while (!q.empty()) {
        cout << q.top() << " "; // 每次读取当前最小值
        q.pop(); // 删除最小值，让下一个最小值成为堆顶
    }
    cout << endl;
}

signed main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tt = 1;
    // cin>>tt;
    while (tt--) solve();
    return 0;
}

// ease2k // eAs1nGG-_- //
```

输入：

```text
5
3 1 5 2 5
```

输出：

```text
1 2 3 5 5
```

时间复杂度为 $O(n\log n)$，额外空间复杂度为 $O(n)$。

## 六、堆为什么能快速找到最值

二叉堆可以看作一棵**完全二叉树**，通常存储在数组或 `vector` 中。以从 `1` 开始的下标为例：

| 位置 | 下标 |
| --- | --- |
| 当前节点 | `i` |
| 父节点 | `i / 2` |
| 左孩子 | `i * 2` |
| 右孩子 | `i * 2 + 1` |

大根堆中，每个父节点的值都不小于其孩子，因此根节点一定是全局最大值。

例如，下面是一个合法的大根堆：

```text
        9
       / \
      7   8
     / \
    1   2
```

按层存储得到 `9 7 8 1 2`，这个序列**没有整体排好序**。堆只保证父子之间满足大小关系，不保证兄弟节点或其他位置之间有序。

- 插入：把新元素放到末尾，必要时与父节点交换，逐层向上调整。
- 删除堆顶：用末尾元素补到根节点，必要时与优先级更高的孩子交换，逐层向下调整。
- 完全二叉树的高度为 $O(\log n)$，所以堆调整只需要经过 $O(\log n)$ 层。

使用标准库时，这些调整由 `push()` 和 `pop()` 自动完成，不需要手动维护。

## 七、自定义比较规则：结构体优先队列

当元素是结构体时，需要告诉优先队列：什么样的元素应该先取出。

假设每个人有编号 `id` 和分数 `val`，希望：

1. 分数高的人先取出。
2. 分数相同时，编号小的人先取出。

### 1. 使用 operator< 定义规则

对于默认的 `priority_queue<node>`，可以把 `a < b` 理解为：**按照我们定义的规则，a 的优先级低于 b**。

```cpp
struct node {
    int id, val;

    bool operator<(const node &a) const {
        if (val != a.val) return val < a.val; // 分数低，优先级低
        return id > a.id; // 同分时，编号大，优先级低
    }
};
```

这里函数中的 `val`、`id` 是当前对象的成员，`a.val`、`a.id` 是另一个对象的成员。

- 当前分数为 `80`，对方为 `90`：返回 `true`，当前对象优先级更低。
- 当前编号为 `5`，对方为 `2`，分数相同：返回 `true`，当前对象优先级更低。

不要照搬 `sort()` 中“谁排在前面就返回 true”的直觉：优先队列会把比较规则下较大的元素放在堆顶。

### 2. 完整示例

输入 $n$，接着输入 $n$ 行，每行包含编号和分数。按照上述优先级输出。

```cpp
#include <bits/stdc++.h>

using namespace std;

#define endl '\n'
#define int long long

const int N = 2e5 + 5;
const int MOD = 1e9 + 7;
const int INF = 0x3f3f3f3f3f3f3f3f;
const double PI = acos(-1.0);

struct node {
    int id, val;

    bool operator<(const node &a) const {
        if (val != a.val) return val < a.val; // 分数高的优先
        return id > a.id; // 同分时编号小的优先
    }
};

void solve() {
    int n;
    cin >> n;

    priority_queue<node> q; // 使用 node 内定义的 operator<
    for (int i = 1; i <= n; i++) {
        node x;
        cin >> x.id >> x.val;
        q.push(x); // 自动按照分数、编号两级规则维护堆
    }

    while (!q.empty()) {
        node x = q.top(); // 复制堆顶，再删除；不要保存即将失效的引用
        q.pop();
        cout << x.id << " " << x.val << endl;
    }
}

signed main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tt = 1;
    // cin>>tt;
    while (tt--) solve();
    return 0;
}

// ease2k // eAs1nGG-_- //
```

输入：

```text
4
3 90
1 80
2 90
4 100
```

输出：

```text
4 100
2 90
3 90
1 80
```

代码讲解：

1. `node` 和比较函数定义在 `solve()` 外。
2. `q.push(x)` 插入整个结构体。
3. 分数最高的 `4 100` 先取出。
4. 两个 `90` 分的元素中，编号 `2` 比编号 `3` 更优先。

如果希望分数低的人先取出，同分时仍然编号小的先取出，只需将比较函数改成：

```cpp
bool operator<(const node &a) const {
    if (val != a.val) return val > a.val;
    return id > a.id;
}
```

### 3. 比较函数的要求

比较规则必须保持一致，并满足**严格弱序**。入门时至少注意：

- 不能使用 `<=` 或 `>=` 代替严格比较；元素与自身比较必须返回 `false`。
- 规则必须具有传递性，不能出现 `a` 优先于 `b`、`b` 优先于 `c`，却又让 `c` 优先于 `a` 的循环。
- 不要通过减法的正负来判断大小，直接使用 `<`、`>` 可以避免差值溢出。
- 不要在元素留在堆里时改变决定它们优先级的外部状态，否则已有堆结构可能失效。

如果两个元素在比较规则下优先级相同，`priority_queue` **不保证先插入的先取出**。需要按插入顺序处理时，应额外记录递增编号，并将编号纳入比较规则。

## 八、pair 的比较规则

`pair` 默认按照字典序比较：先比较 `first`，只有 `first` 相同才比较 `second`。

```cpp
priority_queue<pair<int, int>> q; // first 大的优先；同 first 时 second 大的优先

q.push({3, 10});
q.push({3, 20});
q.push({2, 100});
```

依次取出的顺序为：

```text
(3, 20) → (3, 10) → (2, 100)
```

如果定义成小根堆：

```cpp
priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> q;
```

则 `first` 小的优先；`first` 相同时，`second` 小的优先。

例如，在某些图算法中可以用 `{距离, 点的编号}` 表示一个状态，让距离最小的状态先被取出。

## 九、应用：维护最大的 k 个数

输入 $n$ 个整数，满足 $1 \le k \le n$，求其中第 $k$ 大的数。这里按元素个数计数，重复值也占位置。

例如，`8 8 3` 的第 `2` 大是 `8`。

思路：使用小根堆，始终只保留当前读过的数中最大的 $k$ 个。

1. 插入新数。
2. 如果元素个数超过 $k$，删除当前最小值。
3. 全部处理完后，堆里剩下最大的 $k$ 个数。
4. 这 $k$ 个数中的最小值就是第 $k$ 大的数。

**为什么使用小根堆？** 因为我们要淘汰的是保留候选中的最小值，所以需要让它在堆顶。

```cpp
#include <bits/stdc++.h>

using namespace std;

#define endl '\n'
#define int long long

const int N = 2e5 + 5;
const int MOD = 1e9 + 7;
const int INF = 0x3f3f3f3f3f3f3f3f;
const double PI = acos(-1.0);

void solve() {
    int n, k;
    cin >> n >> k; // 本例保证 1 <= k <= n

    priority_queue<int, vector<int>, greater<int>> q;
    for (int i = 1; i <= n; i++) {
        int x;
        cin >> x;
        q.push(x); // 先将当前数加入候选
        if ((int)q.size() > k) q.pop(); // 候选过多时，淘汰最小值
    }

    cout << q.top() << endl; // 最大的 k 个数中，最小的就是第 k 大
}

signed main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tt = 1;
    // cin>>tt;
    while (tt--) solve();
    return 0;
}

// ease2k // eAs1nGG-_- //
```

输入：

```text
6 3
4 1 7 3 9 7
```

输出：

```text
7
```

处理结束后，保留的三个数为 `7、7、9`，堆顶是 `7`。

每次循环结束后，堆中保留最大的 $\min(i,k)$ 个数；加入第 $i+1$ 个数后，删除候选中的最小值，就仍然满足这个性质。

时间复杂度为 $O(n\log(k+1))$，额外空间复杂度为 $O(k)$。写成 $\log(k+1)$ 可以同时覆盖 $k=1$ 的情况。

同理，如果要维护**最小的 k 个数**，应使用大根堆，超过 $k$ 个时删除当前最大值。

## 十、常见错误

### 1. 在空队列上调用 top() 或 pop()

```cpp
priority_queue<int> q;
// q.top(); // 错误：当前没有元素
// q.pop(); // 错误：当前没有元素
```

应先通过 `empty()` 判断，或通过题目逻辑保证非空。

### 2. 混淆普通队列与优先队列

| 数据结构 | 访问当前要取出的元素 |
| --- | --- |
| 普通队列 `queue` | `front()` |
| 优先队列 `priority_queue` | `top()` |

优先队列没有 `front()`、`back()`，也不能用 `q[i]` 访问某个位置。

### 3. 认为内部已经整体排序

堆只保证堆顶是最优元素。要按优先级依次取出，需要不断 `top()`、`pop()`。

如果只是想查看全部元素并保留原队列，可以先复制：

```cpp
auto p = q; // 复制一份，时间与额外空间均为 O(n)
while (!p.empty()) {
    cout << p.top() << " "; // 此片段假设元素为整数
    p.pop(); // 只删除副本中的元素
}
cout << endl;
```

复制后依次弹出的总时间为 $O(n\log n)$。

### 4. 直接修改堆顶

`top()` 返回的是只读引用，不能写 `q.top() = x`。

如果确实要替换当前堆顶，应先 `pop()` 再 `push(x)`。标准 `priority_queue` 不提供直接修改任意元素、删除任意元素或遍历的接口；有这类需求时，需要额外设计，例如使用 `multiset` 或维护失效标记。

### 5. 多组数据忘记清空

本文把优先队列定义在 `solve()` 内，每次调用都会得到一个新队列。

如果定义在全局，需要在每组数据开始前清空。优先队列没有 `clear()`，可以写：

```cpp
while (!q.empty()) q.pop();
```

## 十一、用法速查

```cpp
priority_queue<int> q; // 大根堆
priority_queue<int, vector<int>, greater<int>> p; // 小根堆

q.push(x); // 插入 x
q.top(); // 读取堆顶，要求非空
q.pop(); // 删除堆顶，要求非空，没有返回值
q.empty(); // 判断是否为空
q.size(); // 获取元素个数
```

选择堆类型时，要先确定**每次希望取出或删除谁**：

- 每次取最大值：大根堆。
- 每次取最小值：小根堆。
- 保留最大的 $k$ 个：小根堆，淘汰最小值。
- 保留最小的 $k$ 个：大根堆，淘汰最大值。
- 按多个条件决定优先级：结构体加自定义比较规则。

参考文档：[Microsoft Learn：priority_queue 类的定义与接口](https://learn.microsoft.com/en-us/cpp/standard-library/priority-queue-class?view=msvc-170)。
