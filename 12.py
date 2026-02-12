name = input("Enter your name: ")
print("Hello,", name)

age = int(input("Enter your age: "))
print("You are", age, "years old.")

price = float(input("Enter price: "))
print("Final Price =", price)

a, b = map(int, input("Enter two numbers: ").split())
print(a + b)

x, y, z = map(float, input("Enter three decimals: ").split())
print(x, y, z)

nums = list(map(int, input("Enter numbers: ").split()))
print(nums)

data = input("Enter values: ").split(",")
print(data)

x = eval("10 + 20")
print(x)  

expr = input("Enter expression (ex: 10+5*2): ")
result = eval(expr)
print("Result =", result)

lst = eval(input("Enter a list: "))

name = input("Enter name: ")
if name == "admin":
    print("Welcome Admin!")
else:
    print("Hello User!")

s = input("Enter text: ").lower()
print("Cleaned text =", s)

words = ["Python", "is", "awesome"]
sentence = " ".join(words)
print(sentence)

text = "I like Java"
text = text.replace("Java", "Python")
print(text)