# Input
V = int(input())
W = int(input())

# Validation
if W % 2 != 0 or W < 2 or V >= W or W < 2*V or W > 4*V:
    print("INVALID INPUT")
else:
    FW = (W - 2 * V) // 2
    TW = V - FW
    print("TW =", TW, "FW =", FW)
