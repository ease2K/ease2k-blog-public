# C++ sort 入门：从传统排序到自定义排序

排序是程序设计中常见的操作。例如，将成绩从高到低排列、将商品按价格排序，都需要用到排序。

学习 C 语言时，我们通常先接触冒泡排序、选择排序和插入排序；到了 C++，则可以使用标准库提供的 `sort` 完成排序。

本文先介绍几种传统排序的思路，再讲解 `sort` 的使用方法。所有代码统一使用 C++ 模板，传统排序部分也使用 C++ 输入输出，便于直接运行和对比。

> `<bits/stdc++.h>` 常用于 GCC 竞赛环境，不属于标准 C++ 头文件。

## 一、传统排序算法

假设需要将下面的数组按升序排列：

```text
5 2 4 1 3
```

排序结果应该是：

```text
1 2 3 4 5
```

先给出完整程序，包含冒泡排序、选择排序和插入排序。在 `solve()` 中只调用其中一个函数，就能切换排序方法。

```cpp
#include <bits/stdc++.h>

using namespace std;

#define endl '\n'
#define int long long

const int N = 2e5 + 5;
const int MOD = 1e9 + 7;
const int INF = 0x3f3f3f3f3f3f3f3f;
const double PI = acos(-1.0);

int a[N], n;

void bubble_sort() {
    for (int i = 1; i < n; i++) {
        int flag = 0;
        for (int j = 1; j <= n - i; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
                flag = 1;
            }
        }
        if (!flag) break;
    }
}

void selection_sort() {
    for (int i = 1; i < n; i++) {
        int pos = i;
        for (int j = i + 1; j <= n; j++) {
            if (a[j] < a[pos]) {
                pos = j;
            }
        }
        if (pos != i) {
            int t = a[i];
            a[i] = a[pos];
            a[pos] = t;
        }
    }
}

void insertion_sort() {
    for (int i = 2; i <= n; i++) {
        int x = a[i];
        int j = i - 1;
        while (j >= 1 && a[j] > x) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = x;
    }
}

void solve() {
    cin >> n;
    for (int i = 1; i <= n; i++) {
        cin >> a[i];
    }

    bubble_sort();
    // selection_sort();
    // insertion_sort();

    for (int i = 1; i <= n; i++) {
        cout << a[i] << " ";
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
5 2 4 1 3
```

输出：

```text
1 2 3 4 5
```

示例假设输入满足 `1 <= n < N`。数组容量不意味着这些传统算法适合处理二十万个元素：它们的最坏时间复杂度都是 $O(n^2)$，演示时应使用较小的数据。

### 1. 冒泡排序：相邻比较，逐步交换

冒泡排序不断比较相邻元素，如果前面的元素更大，就交换它们。

```cpp
if (a[j] > a[j + 1]) {
    int t = a[j];
    a[j] = a[j + 1];
    a[j + 1] = t;
}
```

第一轮的过程如下：

```text
5 2 4 1 3
2 5 4 1 3
2 4 5 1 3
2 4 1 5 3
2 4 1 3 5
```

这一轮结束后，最大值 `5` 被放到了末尾。

每轮都会将当前未排序部分的最大值移动到末尾，因此第 `i` 轮不再处理后面已经排好的 `i - 1` 个元素：

```cpp
for (int j = 1; j <= n - i; j++)
```

代码中的 `flag` 表示这一轮是否发生交换：

```cpp
if (!flag) break;
```

如果一整轮都没有交换，说明数组已经有序，可以提前结束。

### 2. 选择排序：每轮选出最小值

选择排序每轮从未排序部分中找到最小值，将它交换到前面。

```cpp
int pos = i;
for (int j = i + 1; j <= n; j++) {
    if (a[j] < a[pos]) {
        pos = j;
    }
}
```

`pos` 保存当前找到的最小值的位置。

排序过程如下：

```text
初始：  5 2 4 1 3
第一轮：1 2 4 5 3
第二轮：1 2 4 5 3
第三轮：1 2 3 5 4
第四轮：1 2 3 4 5
```

处理位置 `i` 之前，`a[1]` 到 `a[i - 1]` 已经排好，而且是整个数组中最小的 `i - 1` 个元素。接下来只需要从 `a[i]` 到 `a[n]` 中选出最小值，放到 `a[i]`。

选择排序每轮最多交换一次，但仍然需要大量比较。即使数组已经有序，它也会继续扫描未排序部分。

### 3. 插入排序：将元素插入有序部分

插入排序类似整理扑克牌：前面已经有序，每拿到一个新元素，就把它插入合适的位置。

```cpp
int x = a[i];
int j = i - 1;
while (j >= 1 && a[j] > x) {
    a[j + 1] = a[j];
    j--;
}
a[j + 1] = x;
```

处理位置 `i` 时，前面的 `a[1]` 到 `a[i - 1]` 已经有序。

先保存当前元素 `x`，再将比它大的元素向右移动，最后把 `x` 放入空出的位置。

```text
初始：  5 2 4 1 3
插入 2：2 5 4 1 3
插入 4：2 4 5 1 3
插入 1：1 2 4 5 3
插入 3：1 2 3 4 5
```

编写代码时注意两点：

- 必须先保存 `a[i]`，避免移动元素时覆盖它。
- `j >= 1` 放在 `&&` 左边。由于逻辑与会短路求值，边界条件不满足时，不会继续读取 `a[j]`。

### 4. 三种算法的对比

| 算法 | 最好时间复杂度 | 平均时间复杂度 | 最坏时间复杂度 | 上述实现是否稳定 |
|---|---|---|---|---|
| 冒泡排序，带提前退出 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | 是 |
| 选择排序 | $O(n^2)$ | $O(n^2)$ | $O(n^2)$ | 否 |
| 插入排序 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | 是 |

这三种实现的额外空间复杂度都是 $O(1)$。

**稳定排序**指的是：排序关键字相同的元素，排序后仍保持原来的相对顺序。例如，只按成绩排序时，同分学生保持输入时的先后顺序。

## 二、使用 C++ sort

C++ 提供了标准库函数 `sort`，默认按升序排序。

完整代码如下：

```cpp
#include <bits/stdc++.h>

using namespace std;

#define endl '\n'
#define int long long

const int N = 2e5 + 5;
const int MOD = 1e9 + 7;
const int INF = 0x3f3f3f3f3f3f3f3f;
const double PI = acos(-1.0);

int a[N], n;

void solve() {
    cin >> n;
    for (int i = 1; i <= n; i++) {
        cin >> a[i];
    }

    sort(a + 1, a + n + 1);

    for (int i = 1; i <= n; i++) {
        cout << a[i] << " ";
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

核心只有一行：

```cpp
sort(a + 1, a + n + 1);
```

`sort` 会直接修改原数组，返回值为 `void`。

从 C++11 起，标准要求 `sort` 对长度为 $n$ 的区间进行 $O(n\log n)$ 次比较。因此，相比前面的三种传统算法，它更适合处理大规模数据。

## 三、排序范围：左闭右开

`sort` 的基本形式是：

```cpp
sort(first, last);
```

排序范围为 `[first, last)`，也就是：**包含起点，不包含终点。**

我们使用下标 `1` 到 `n`，因此写成：

```cpp
sort(a + 1, a + n + 1);
```

如果写成：

```cpp
sort(a + 1, a + n);
```

就只会排序到 `a[n - 1]`，漏掉 `a[n]`。

排序下标 `l` 到 `r`，并包含两端，应写成：

```cpp
sort(a + l, a + r + 1);
```

例如，数组为：

```text
9 5 3 4 8
```

执行：

```cpp
sort(a + 2, a + 5);
```

只排序下标 `2、3、4`，结果为：

```text
9 3 4 5 8
```

## 四、从大到小排序

在 `solve()` 外定义比较函数：

```cpp
bool cmp(int x, int y) {
    return x > y;
}
```

调用：

```cpp
sort(a + 1, a + n + 1, cmp);
```

比较函数的含义是：

> `cmp(x, y)` 返回 `true`，表示按照排序规则，`x` 应排在 `y` 前面。

因此：

```cpp
return x < y;  // 升序
return x > y;  // 降序
```

也可以使用标准库中的 `greater`：

```cpp
sort(a + 1, a + n + 1, greater<int>());
```

在当前模板中，`int` 会被宏替换为 `long long`，这里实际使用的是 `greater<long long>()`。

## 五、结构体的多条件排序

假设需要对学生排序，要求：

1. 成绩高的排在前面。
2. 成绩相同时，学号小的排在前面。

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
    int id, score;
} a[N];

int n;

bool cmp(const node &x, const node &y) {
    if (x.score != y.score) {
        return x.score > y.score;
    }
    return x.id < y.id;
}

void solve() {
    cin >> n;
    for (int i = 1; i <= n; i++) {
        cin >> a[i].id >> a[i].score;
    }

    sort(a + 1, a + n + 1, cmp);

    for (int i = 1; i <= n; i++) {
        cout << a[i].id << " " << a[i].score << endl;
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
1 95
2 90
4 80
```

输出：

```text
1 95
2 90
3 90
4 80
```

比较函数先判断成绩：

```cpp
if (x.score != y.score) {
    return x.score > y.score;
}
```

只有成绩相同时，才比较学号：

```cpp
return x.id < y.id;
```

多条件排序通常按照“主要条件优先，相同后再比较次要条件”的顺序编写。

`const node &` 表示通过引用读取结构体，避免复制，同时不允许通过这个引用修改对象。

## 六、比较函数不能写 <=

下面的写法是错误的：

```cpp
bool cmp(int x, int y) {
    return x <= y;
}
```

当 `x == y` 时，它仍然返回 `true`，相当于认为一个元素应排在自己前面。

`sort` 要求比较函数形成严格弱序。对于普通整数比较，可以先理解以下要求：

- `cmp(x, x)` 必须返回 `false`。
- 不能同时认为 `x` 在 `y` 前面、`y` 又在 `x` 前面。
- 比较关系必须满足传递性：如果 `x` 在 `y` 前面，`y` 在 `z` 前面，那么 `x` 也应在 `z` 前面。

完整的严格弱序还要求比较规则产生的等价关系具有传递性。使用普通整数的 `<` 或 `>` 可以满足这些要求。

因此，普通升降序排序使用：

```cpp
return x < y;
```

或者：

```cpp
return x > y;
```

错误的比较函数可能导致未定义行为，包括排序异常或程序崩溃。

## 七、对 vector 排序

`vector` 可以理解为能够动态调整大小的数组。普通数组通过指针指定排序范围，`vector` 则通过迭代器指定范围：

```cpp
sort(a.begin(), a.end());
```

其中：

- `a.begin()` 指向第一个元素。
- `a.end()` 指向最后一个元素的后一个位置，不能解引用读取元素。

排序范围仍然是左闭右开区间，因此这行代码会排序整个 `vector`。即使 `vector` 为空，也可以这样调用。

### 1. 完整的升序排序示例

下面沿用从下标 `1` 开始的习惯，创建大小为 `n + 1` 的 `vector`，只使用下标 `1` 到 `n`。

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
    vector<int> a(n + 1);

    for (int i = 1; i <= n; i++) {
        cin >> a[i];
    }

    sort(a.begin() + 1, a.end());

    for (int i = 1; i <= n; i++) {
        cout << a[i] << " ";
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
5 2 4 1 3
```

输出：

```text
1 2 3 4 5
```

由于 `a` 的大小是 `n + 1`，所以 `a.end()` 对应下标 `n + 1` 的位置。这里的排序范围是下标 `1` 到 `n`，不会将未使用的 `a[0]` 一起排序。

也可以等价地写成：

```cpp
sort(a.begin() + 1, a.begin() + n + 1);
```

### 2. 从下标 0 开始的写法

`vector` 的实际下标从 `0` 开始。如果直接用初始化列表创建：

```cpp
vector<int> a = {5, 2, 4, 1, 3};
sort(a.begin(), a.end());
```

这里五个元素的下标为 `0` 到 `4`，应排序整个区间。

注意区分两种用法：

| 创建方式 | 使用的下标 | 排序整个有效区间 |
|---|---|---|
| `vector<int> a(n);`，使用全部元素 | `0` 到 `n - 1` | `sort(a.begin(), a.end());` |
| `vector<int> a(n + 1);`，跳过 `a[0]` | `1` 到 `n` | `sort(a.begin() + 1, a.end());` |

如果使用第二种方式，却从 `a.begin()` 开始排序，未使用的 `a[0]` 也会参与排序，可能影响结果。

### 3. 降序与自定义比较函数

对于使用下标 `1` 到 `n`、大小为 `n + 1` 的 `vector`，降序排序可以写成：

```cpp
sort(a.begin() + 1, a.end(), greater<int>());
```

也可以在 `solve()` 外定义比较函数：

```cpp
bool cmp(int x, int y) {
    return x > y;
}
```

调用：

```cpp
sort(a.begin() + 1, a.end(), cmp);
```

比较函数的规则与普通数组完全相同。

### 4. 只排序一部分元素

如果只需要排序下标 `l` 到 `r`，并包含两端：

```cpp
sort(a.begin() + l, a.begin() + r + 1);
```

例如：

```cpp
vector<int> a = {9, 5, 3, 4, 8};
sort(a.begin() + 1, a.begin() + 4);
```

这里使用从 `0` 开始的下标，只排序下标 `1、2、3`，结果为：

```text
9 3 4 5 8
```

使用局部区间时，需要保证 `0 <= l <= r < a.size()`。终点可以是 `a.end()`，但不能超过它。

### 5. vector 大小与容量的区别

创建：

```cpp
vector<int> a(n + 1);
```

会直接创建 `n + 1` 个元素，因此可以访问 `a[1]` 到 `a[n]`。

但下面的代码只预留内存容量，没有创建元素：

```cpp
vector<int> a;
a.reserve(n + 1);
```

此时 `a.size()` 仍然是 `0`，不能直接写入 `a[1]`。如果需要按下标读入，可以使用：

```cpp
a.resize(n + 1);
```

或者创建时就指定大小。

对包含 $n$ 个待排序元素的 `vector` 使用 `sort`，比较次数同样为 $O(n\log n)$。

## 八、常用写法速查

| 需求 | 写法 |
|---|---|
| 数组下标 `1` 到 `n` 升序 | `sort(a + 1, a + n + 1);` |
| 数组下标 `l` 到 `r` 升序 | `sort(a + l, a + r + 1);` |
| 降序 | `sort(a + 1, a + n + 1, greater<int>());` |
| 自定义规则 | `sort(a + 1, a + n + 1, cmp);` |
| 普通 `vector` 排序 | `sort(a.begin(), a.end());` |
| `vector` 只排序下标 `1` 到 `n` | `sort(a.begin() + 1, a.begin() + n + 1);` |

最后一种写法要求 `vector` 的大小至少为 `n + 1`。

`sort` 要求随机访问迭代器，因此可以用于普通数组和 `vector`，不能直接用于 `list`；`list` 有自己的成员函数 `sort()`。

传统排序帮助我们理解比较、交换和移动元素的过程。实际使用 C++ 时，通常优先考虑 `sort`，重点检查排序区间是否正确，以及比较函数是否满足排序要求。
