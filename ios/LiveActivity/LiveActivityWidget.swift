import ActivityKit
import SwiftUI
import WidgetKit

struct WorkoutLiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var remainingSeconds: Int
    var exerciseName: String
    var nextExercise: String?
    var setInfo: String?
    var weightReps: String?
    var iconName: String?
    var themeColor: String
  }

  var endTime: Double
  var exerciseName: String
  var nextExercise: String?
  var setInfo: String?
  var weightReps: String?
  var iconName: String?
  var themeColor: String
}

struct WorkoutLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutLiveActivityAttributes.self) { context in
      WorkoutLiveActivityView(contentState: context.state, attributes: context.attributes)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading, priority: 1) {
          VStack(alignment: .leading, spacing: 4) {
            Text("REST")
              .font(.caption)
              .fontWeight(.semibold)
              .foregroundStyle(.white.opacity(0.8))
            Text(context.state.exerciseName)
              .font(.footnote)
              .fontWeight(.medium)
              .foregroundStyle(.white)
              .lineLimit(2)
          }
          .padding(.leading, 8)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if let iconName = context.state.iconName {
            Image(iconName)
              .resizable()
              .frame(width: 24, height: 24)
              .padding(.trailing, 8)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack {
            Text(formatTime(context.state.remainingSeconds))
              .font(.title2)
              .fontWeight(.bold)
              .foregroundStyle(Color(hex: context.state.themeColor) ?? .blue)
            Spacer()
            Button("Skip Rest") {
              // Skip rest action
            }
            .font(.caption)
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.2))
            .clipShape(RoundedRectangle(cornerRadius: 12))
          }
          .padding(.horizontal, 12)
          .padding(.bottom, 8)
        }
      } compactLeading: {
        if let iconName = context.state.iconName {
          Image(iconName)
            .resizable()
            .frame(width: 20, height: 20)
        }
      } compactTrailing: {
        Text(formatTime(context.state.remainingSeconds))
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundStyle(Color(hex: context.state.themeColor) ?? .blue)
      } minimal: {
        Text(formatTime(context.state.remainingSeconds))
          .font(.caption2)
          .fontWeight(.bold)
          .foregroundStyle(Color(hex: context.state.themeColor) ?? .blue)
      }
    }
  }
  
  private func formatTime(_ seconds: Int) -> String {
    let minutes = seconds / 60
    let remainingSeconds = seconds % 60
    return String(format: "%d:%02d", minutes, remainingSeconds)
  }
}