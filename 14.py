n = 3

print("Star Pattern:")
for i in range(1, n+1):
    print(" " * (n - i), end="")
    print("* " * i)

print("\nNumber Pattern:")
for i in range(1, n+1):
    for j in range(1, i+1):
        print(j, end=" ")
    print()

print("\nAlphabet Pattern:")
for i in range(1, n+1):
    for j in range(i):
        print(chr(65 + j), end="")
    print()
