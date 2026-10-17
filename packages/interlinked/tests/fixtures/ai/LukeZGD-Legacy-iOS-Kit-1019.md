## What's missing from the wiki

The [Troubleshooting wiki](https://github.com/LukeZGD/Legacy-iOS-Kit/wiki/Troubleshooting) currently has this note under **iPhone 4 powdersn0w**:

> 8GB models may not work with downgrades below iOS 6

But there is no equivalent warning for **iPhone 4S** — and 8GB iPhone 4S units are incompatible with **iOS 6.1.3 itself** (not just "below iOS 6").

## Symptom

Restore hangs permanently at:
```
Status: Waiting for NAND (28)
```

No progress for 1+ hour. idevicerestore never errors — it just polls forever. The device's `restored_external` daemon is attempting the LwVM NAND reformat but the 8GB NAND controller never completes it.

This is confirmed in issue #767 by @LukeZGD:
> "oh that's why, most 8gb models of 4s are not compatible with ios 6"

## Suggested wiki addition

Under the **32-bit devices** section or a new **Notes for iPhone 4S** section, add:

> **8GB models**: iPhone 4S 8GB units are not compatible with iOS 6.1.3. The restore will hang at "Waiting for NAND (28)" indefinitely. There is no fix — this is a hardware limitation of the 8GB NAND controller. The lowest achievable iOS on 8GB models requires saved SHSH blobs for iOS 7+.

## Device info

- iPhone4,1 (n94ap), 8GB, manufactured June 2013
- Attempted target: iOS 6.1.3 (10B329)
- Method: kDFU via SSH (jailbroken with Phoenix on iOS 9.3.6)
- CustomJ IPSW (jailbreak enabled, **no --multipatch**)

## Bonus: --multipatch is critical for iOS 6.1.3

Separately: for **16GB+ iPhone 4S** users who hit NAND issues, `--multipatch` is not optional for iOS 6.1.3 targets. It replaces the stock `restored_external` in the ramdisk with `resources/patch/re` and adds `pio-error=0` + `amfi_get_out_of_my_way=1` to the iBEC boot args. Without it, the stock iOS 6.1.3 `restored_external` can also hang at status 28 on hardware coming from iOS 9. Might be worth documenting this as a recommended flag for iPhone 4S → iOS 6.1.3 restores.

Thanks for the tool — even in failure it taught a lot about the restore internals.
