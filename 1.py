
s = input("Enter a string: ")
words = s.split()
print("1. Word Count:", len(words))

print("2. Character Count:", len(s))

print("3. Capitalized String:", s.title())
print("4. Reversed String:", s[::-1])
vowels = "aeiouAEIOU"
vowel_count = sum(1 for ch in s if ch in vowels)
print("5. Vowel Count:", vowel_count)
remove_vowels = "".join(ch for ch in s if ch not in vowels)
print("6. String Without Vowels:", remove_vowels)
clean = s.replace(" ", "").lower()
if clean == clean[::-1]:
    print("7. Palindrome: Yes")
else:
    print("7. Palindrome: No")
result = ""
for ch in s:
    if ch not in result:
        result += ch

print("8. String Without Duplicates:", result)


