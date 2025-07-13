---
title: "LLMs Ace SQL… Just Ignore the Footnotes"
date: "July 13, 2025"
---

Few days ago, I came accross [BIRD](https://bird-bench.github.io/) benchmark that evaluates LLM performance on natural language to SQL. The model namely XiYan-SQL, at the 5th position is open source with all of [paper](https://arxiv.org/abs/2411.08599) [weights](https://huggingface.co/XGenerationLab/XiYanSQL-QwenCoder-32B-2412) and [codes](https://github.com/XGenerationLab/XiYan-SQL) available. The 32B parameter model [XiYan-SQL](https://huggingface.co/XGenerationLab/XiYanSQL-QwenCoder-32B-2412) performs better than GPT-4o on multiple [benchmarks](https://huggingface.co/XGenerationLab/XiYanSQL-QwenCoder-32B-2412).

In this article, I will compare Natural Language to SQL (NLToSQL) generation performance for Xiyan-SQL 3B(Quantized to 8 bit) and 32B parameter models vs gpt-4o.

Before this I want to introduce a method of `context engineering` for schema representation, used in the paper, that has increased different llm's performance by >2 percentage points (Table 6 of the paper).

## Building a Smarter SQL Schema: Meet M-Schema (The `context` That Outsmarts DDL)

If you’ve ever wrestled with turning plain English into SQL, you know the silent killer is **context**. The user asks *“Which heroes can fly?”*—but the AI has no idea that `hero_id` is an integer, that `superpower.id` is the key to unlock the answer, or that “fly” hides in the column `power_name`.
Enter **M-Schema**: a lightweight, line-by-line recipe that gives language models everything they need—data types, keys, sample values, even the exact joins—in a format short enough to paste into a single prompt.

Below we’ll walk through the superhero database from the original paper, showing how four tiny steps turn a bare list of tables into a **2–3 % accuracy boost** over traditional DDL.

---

### Step 1: Plant the Flag
Start every schema with one line that shouts *“We’re in the superhero database.”*

```
[DB_ID] superhero
```

That’s it. No brackets, no extra punctuation. The AI immediately scopes every downstream token to this single source of truth.

---

### Step 2: Name Your Tables
Each table gets a single, human-readable header.

```
# Table: hero_power
```

Readable by humans, parsable by machines. Nothing more to remember.

---

### Step 3: Turn Columns into Cheat-Sheets
Here’s where M-Schema flexes. Instead of the usual *“hero_id INT PK”* shorthand, each column is compressed into **one tuple** that carries five pieces of intel:

```
(hero_id:INTEGER, Primary Key, the id of the hero Maps to superhero(id), Examples: [1, 2, 3])
```

Break it down:

1. **Column name** – `hero_id`
2. **Data type** – `INTEGER` (no guessing, no casting surprises)
3. **Key status** – `Primary Key` (joins become obvious)
4. **Semantic hint** – `the id of the hero Maps to superhero(id)` (drawn live from the DB’s own metadata)
5. **Live samples** – `[1, 2, 3]` (three real values so the model sees the shape of the data)

All that in **one line**. Compare that to the 3–4 lines of noisy DDL it replaces.

---

### Step 4: Wire Up the World
After every table is described, foreign-key relationships are listed in plain sight:

```
[Foreign keys]
hero_power.power_id = superpower.id
```

No arcane `REFERENCES` syntax—just *“Left dot right equals right dot left”*. Even a non-SQL reader can follow the join path.

---

### Why M-Schema Wins
- **More signal, less noise** – Data types, keys, and examples remove 90 % of the ambiguity that kills Text-to-SQL systems.
- **Tiny footprint** – Entire schemas often fit in the same context window that once held only one bloated DDL statement.
- **Proven lift** – GPT-4o picks up an **average 2.03 % accuracy gain** over classic DDL, and smaller models see even larger jumps.

If you’re shipping a natural-language SQL feature, copy-pasting M-Schema into your prompt is the **fastest, cheapest** upgrade you can ship today.


## NLToSQL: Xiyan SQL vs GPT-4o:

For the following task, I have used [SQLite database](https://github.com/jpwhite3/northwind-SQLite3), [Xiyan mcp server](https://github.com/ahmedmustahid/xiyan_mcp_server) and [MCP Inspector](https://github.com/modelcontextprotocol/inspector). Check the [README.md](https://github.com/ahmedmustahid/xiyan_mcp_server/blob/main/README.md) for Xiyan-mcp usage and Xiyan [llama-cpp README](https://github.com/ahmedmustahid/xiyan_mcp_server/blob/main/src/xiyan_mcp_server/local_model/README.md#llama-cpp-configuration) for local model deployment. XiyanSQL-32B model can be used from [ModelScope](https://www.modelscope.cn/studios/XGenerationLab/XiYanSQL-QwenCoder-32B).

### Question 1: Find the top 10 selling products of all time, including their supplier's name.

| Models | SQL Command |
| :---- | :---- |
| Xiyan-SQL32B | ```SELECT T1.ProductName , T3.CompanyName FROM Products AS T1 JOIN Order Details AS T2 ON T1.ProductID = T2.ProductID JOIN Suppliers AS T3 ON T1.SupplierID = T3.SupplierID GROUP BY T1.ProductID ORDER BY sum(T2.Quantity) DESC LIMIT 10``` |
| GPT-4o | ```SELECT p.ProductName, s.CompanyName AS SupplierName, SUM(od.Quantity) AS TotalQuantitySold FROM [Order Details] od JOIN Products p ON od.ProductID = p.ProductID JOIN Suppliers s ON p.SupplierID = s.SupplierID GROUP BY p.ProductName, s.CompanyName ORDER BY TotalQuantitySold DESC``` |
| Xiyan-SQL3B | ```SELECT T1.ProductName, T2.CompanyName FROM Products AS T1 JOIN Suppliers AS T2 ON T1.SupplierID = T2.SupplierID GROUP BY T1.ProductName, T2.CompanyName ORDER BY SUM(T1.UnitsInStock) DESC LIMIT 10``` |

#### **Step 1: Evaluation**

| Model | Score | Correct Columns | Correct Tables | Correct Joins | Correct Filtering | Correct Aggregation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Xiyan-SQL32B | 9 | ✅ | ✅ | ✅ | ✅ | ✅ |
| GPT-4o | 7 | ✅ | ✅ | ✅ | ❌ | ✅ |
| Xiyan-SQL3B | 1 | ✅ | ❌ | ❌ | ✅ | ❌ |

-----

#### 📊 **Step 2: Ranking**

```
Ranking:
1. XiyanSQL-32B – Score: 9
2. GPT-4o – Score: 7
3. XiyanSQL-3B – Score: 1
```

-----

#### 🧠 **Step 3: Reasoning**

  - **XiyanSQL-32B**: Score 9 – This query is very close to perfect. It correctly joins the three necessary tables (`Products`, `Order Details`, `Suppliers`), aggregates the sales by summing the `Quantity`, orders them correctly in descending order, and properly limits the result to the top 10. The only minor flaw is that the `GROUP BY` clause only includes `T1.ProductID`; standard SQL would require both `T1.ProductName` and `T3.CompanyName` to also be in the `GROUP BY`. However, many SQL dialects like MySQL would handle this correctly.

  - **GPT-4o**: Score 7 – This query has the correct logic for joining and aggregation. The `GROUP BY` clause is more robustly written than in Model 1. However, it completely misses the `LIMIT 10` clause, which was a key requirement of the question ("top 10"). Therefore, it returns all products sorted by sales, not just the top 10.

  - **XiyanSQL-3B**: Score 1 – This query is fundamentally incorrect. It fails to use the `Order Details` table, which contains the sales data (`Quantity`). Instead, it incorrectly attempts to rank products by summing `UnitsInStock`, which reflects inventory levels, not sales performance. This completely misunderstands the user's intent to find the "top selling" products.

-----

#### ❌ **Step 4: Error Categorization**

  - **Model2**: **Incorrect Filtering** – The query fails to filter the result set down to the top 10 records by omitting the `LIMIT` clause.
  - **Model3**: **Incorrect Aggregation or Filtering** – The primary error is using `SUM(T1.UnitsInStock)` for ranking, which is logically incorrect for finding "selling" products. This is also a **Missing Joins** error, as the `Order Details` table is required but absent.



### Question 2: Calculate the total revenue generated from products supplied by each supplier.

| Models | SQL Command |
| :---- | :---- |
| GPT-4o | ```SELECT s.CompanyName AS SupplierName, SUM(od.Quantity * od.UnitPrice * (1 - od.Discount)) AS TotalRevenue FROM [Order Details] od JOIN Products p ON od.ProductID = p.ProductID JOIN Suppliers s ON p.SupplierID = s.SupplierID GROUP BY s.CompanyName ORDER BY TotalRevenue DESC;``` |
| XiyanSQL-32B | ```SELECT S.CompanyName AS SupplierName, SUM(OD.UnitPrice * OD.Quantity) AS TotalRevenue FROM Suppliers S JOIN Products P ON S.SupplierID = P.SupplierID JOIN Order Details OD ON P.ProductID = OD.ProductID GROUP BY S.CompanyName ORDER BY TotalRevenue DESC;```|
| XiyanSQL-3B | ```SELECT T1.CompanyName , SUM(T2.UnitPrice * T2.Quantity * (1 - T2.Discount)) FROM Suppliers AS T1 JOIN Order Details AS T2 ON T1.SupplierID = T2.ProductID GROUP BY T1.CompanyName``` |

#### **Step 1: Evaluation**

| Model | Score | Correct Columns | Correct Tables | Correct Joins | Correct Filtering | Correct Aggregation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| GPT-4o | 10 | ✅ | ✅ | ✅ | ✅ | ✅ |
| XiyanSQL-32B | 6 | ✅ | ✅ | ✅ | ✅ | ❌ |
| XiyanSQL-3B | 0 | ✅ | ❌ | ❌ | N/A | ✅ |

-----

#### 📊 **Step 2: Ranking**

```
Ranking:
1. GPT-4o – Score: 10
2. XiyanSQL-32B – Score: 6
3. XiyanSQL-3B – Score: 0
```

-----

#### 🧠 **Step 3: Reasoning**

  - **GPT-4o**: Score 10 – This query is perfect. It correctly joins `Suppliers`, `Products`, and `Order Details`. Most importantly, its revenue calculation `SUM(od.Quantity * od.UnitPrice * (1 - od.Discount))` is the most accurate, as it properly accounts for any discounts applied to the orders. The grouping and ordering are also correct.

  - **XiyanSQL-32B**: Score 6 – This query has the correct table joins and grouping. However, its revenue calculation `SUM(OD.UnitPrice * OD.Quantity)` is **inaccurate** because it completely ignores the `Discount` on orders. This would result in an inflated and incorrect revenue figure.

  - **XiyanSQL-3B**: Score 0 – This query is invalid and will fail. It attempts to join `Suppliers` directly to `Order Details` using `T1.SupplierID = T2.ProductID`, which is a nonsensical join condition. It completely omits the essential `Products` table required to link a supplier to the products sold in an order.

-----

#### ❌ **Step 4: Error Categorization**

  - **XiyanSQL-32B**: **Incorrect Aggregation or Filtering** – The aggregation `SUM(...)` is incorrect because it fails to factor in the `Discount`, leading to an inaccurate calculation of revenue.
  - **XiyanSQL-3B**: **Missing Joins** – The query is fundamentally broken because it omits the `Products` table and therefore cannot correctly link `Suppliers` to `Order Details`. The join condition it uses is also incorrect.


---

### Question 3: Show products that have a unit price higher than the average unit price of all products.

| Models | SQL Command |
| :---- | :---- |
| GPT-4o | ```SELECT * FROM Products WHERE UnitPrice > (SELECT avg(UnitPrice) FROM Products)``` |
| XiyanSQL-32B | ```SELECT * FROM Products WHERE UnitPrice > (SELECT AVG(UnitPrice) FROM Products);``` |
| XiyanSQL-3B | ```SELECT ProductName FROM Products WHERE UnitPrice > (SELECT avg(UnitPrice) FROM Products)``` |


### ✅ **Step 1: Evaluation**

| Model | Score | Correct Columns | Correct Tables | Correct Joins | Correct Filtering | Ambiguity Handling |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| GPT-4o | 10 | ✅ | ✅ |  ✅ | ✅ | ✅ |
| XiyanSQL-32B | 10 | ✅ | ✅ |  ✅ | ✅ | ✅ |
| XiyanSQL-3B | 10 | ✅ | ✅ |  ✅ | ✅ | ✅ |

-----

### 📊 **Step 2: Ranking**

```
Ranking:
1. GPT-4o – Score: 10
2. XiyanSQL-32B – Score: 10
3. XiyanSQL-3B – Score: 10
```

All three models are ranked equally as they are all perfectly valid and correct ways to answer the question.

-----

## Caveat

Besides these, I have done multiple tests involving more complex queries from [Spider2](https://github.com/xlang-ai/Spider2/tree/main) SQLite database with more complex Natural Language queries taken from `Spider2/spider2-lite/spider2-lite.jsonl` for `California_Traffic_Collision` sqlite database:

```
Please calculate the fatality rate for motorcycle collisions, separated by helmet usage. Specifically, calculate two percentages:
1) the percentage of motorcyclist fatalities in collisions where parties (drivers or passengers) were wearing helmets
and 2) the percentage of motorcyclist fatalities in collisions where parties were not wearing helmets.
For each group, compute this by dividing the total number of motorcyclist fatalities by the total number of collisions
involving that group. Use the parties table to determine helmet usage (from party_safety_equipment fields).
```

While for queries with average difficulties, as discussed in the previous sections, both gpt-4o and Xiyan-SQL32B seem to be equally competent, for complex queries, like in this case, both of them fail to produce correct answers.

---

## Conclusion and Final Thoughts

The title says it all: LLMs are acing SQL, but the "footnotes" matter. While progress is impressive, subtle errors in aggregation or filtering show that even top models like GPT-4o and Xiyan-SQL aren't infallible. They provide a powerful head start on most queries but still hit a wall when faced with true complexity.

The takeaway is to treat these tools as expert co-pilots, not autonomous ones. Effective context engineering with methods like M-Schema is crucial for boosting accuracy, but human validation of the final query remains non-negotiable. The era of fully trusted, automated SQL generation is close, but we're not there yet.
