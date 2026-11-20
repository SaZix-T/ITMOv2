a = float(input("Первое число: "))
op = input("Операция (+ - * /): ")
b = float(input("Второе число: "))

if op == "+":
    print(a + b)
elif op == "-":
    print(a - b)
elif op == "*":
    print(a * b)
elif op == "/":
    if b != 0:
        print(a / b)
    else:
        print("Деление на ноль")
else:
    print("Неизвестная операция")