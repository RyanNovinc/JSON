import ActivityKit
import SwiftUI
import WidgetKit

@main
struct WorkoutLiveActivities: WidgetBundle {
  var body: some Widget {
    WorkoutLiveActivityWidget()
  }
}

extension Date {
  static func toTimerInterval(miliseconds: Double) -> ClosedRange<Date> {
    let start = Date()
    let end = Date(timeIntervalSince1970: miliseconds / 1000.0)
    return start...end
  }
}

extension View {
  func applyWidgetURL(from url: String?) -> some View {
    if let url = url, let widgetURL = URL(string: url) {
      return self.widgetURL(widgetURL)
    } else {
      return self
    }
  }
}