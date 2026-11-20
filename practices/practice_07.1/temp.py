n = int(input())

arr = []

for i in range(n):
    arr += [int(input())]

for i in range(n):
    for j in range(n):
        if arr[i] < arr[j]:
            arr[i], arr[j] = arr[j], arr[i]
pritn(*arr)
