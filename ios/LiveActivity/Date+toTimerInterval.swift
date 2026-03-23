import SwiftUI

extension Date {
  static func toTimerInterval(miliseconds: Double) -> ClosedRange<Self> {
    let endDate = Date(timeIntervalSince1970: miliseconds / 1000)
    let startDate = Date()
    return startDate ... max(startDate, endDate)  // Fixed: consistent range prevents jumping
  }
}
