import SwiftUI

extension Date {
  static func toTimerInterval(miliseconds: Double) -> ClosedRange<Self> {
    let now = Date()
    let endDate = Date(timeIntervalSince1970: miliseconds / 1000)
    
    print("🕐 Timer Interval Calculation:")
    print("  Now: \(now)")
    print("  End Date: \(endDate)")
    print("  Milliseconds: \(miliseconds)")
    print("  Difference: \(endDate.timeIntervalSince(now)) seconds")
    
    // If end date is in the past, create a 1 second timer to show something
    if endDate <= now {
      print("⚠️ End date is in the past! Creating 1s fallback timer")
      let fallbackEnd = now.addingTimeInterval(1)
      return now...fallbackEnd
    }
    
    return now...endDate
  }
}
