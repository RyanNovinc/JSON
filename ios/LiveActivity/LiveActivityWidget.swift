import ActivityKit
import SwiftUI
import WidgetKit

struct LiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var title: String
    var subtitle: String?
    var timerEndDateInMilliseconds: Double?
    var remainingSeconds: Int? // Explicit remaining seconds to avoid calculation mismatches
    var progress: Double?
    var imageName: String?
    var dynamicIslandImageName: String?
  }

  var name: String
  var backgroundColor: String?
  var titleColor: String?
  var subtitleColor: String?
  var progressViewTint: String?
  var progressViewLabelColor: String?
  var deepLinkUrl: String?
  var timerType: DynamicIslandTimerType?
  var padding: Int?
  var paddingDetails: PaddingDetails?
  var imagePosition: String?
  var imageWidth: Int?
  var imageHeight: Int?
  var imageWidthPercent: Double?
  var imageHeightPercent: Double?
  var imageAlign: String?
  var contentFit: String?

  enum DynamicIslandTimerType: String, Codable {
    case circular
    case digital
  }

  struct PaddingDetails: Codable, Hashable {
    var top: Int?
    var bottom: Int?
    var left: Int?
    var right: Int?
    var vertical: Int?
    var horizontal: Int?
  }
}

struct LiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveActivityAttributes.self) { context in
      LiveActivityView(contentState: context.state, attributes: context.attributes)
        .activityBackgroundTint(
          context.attributes.backgroundColor.map { Color(hex: $0) }
        )
        .activitySystemActionForegroundColor(Color.black)
        .applyWidgetURL(from: context.attributes.deepLinkUrl)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading, priority: 1) {
          dynamicIslandExpandedLeading(title: context.state.title, subtitle: context.state.subtitle)
            .dynamicIsland(verticalPlacement: .belowIfTooWide)
            .padding(.leading, 5)
            .applyWidgetURL(from: context.attributes.deepLinkUrl)
        }
        DynamicIslandExpandedRegion(.trailing) {
          dynamicIslandExpandedTrailing(context: context)
            .padding(.trailing, 5)
            .applyWidgetURL(from: context.attributes.deepLinkUrl)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if let date = context.state.timerEndDateInMilliseconds {
            dynamicIslandExpandedBottom(
              endDate: date, progressViewTint: context.attributes.progressViewTint
            )
            .padding(.horizontal, 5)
            .applyWidgetURL(from: context.attributes.deepLinkUrl)
          }
        }
      } compactLeading: {
        // Use system icon with theme-based coloring
        let progressTint = context.attributes.progressViewTint ?? "#007AFF"
        let iconColor: Color = progressTint.contains("pink") || progressTint.contains("ec4899") || progressTint.contains("f472b6") ? .pink : .blue
        
        Image(systemName: "figure.strengthtraining.traditional")
          .font(.system(size: 16, weight: .medium))
          .foregroundColor(iconColor)
          .frame(maxWidth: 23, maxHeight: 23)
          .applyWidgetURL(from: context.attributes.deepLinkUrl)
      } compactTrailing: {
        if context.state.timerEndDateInMilliseconds != nil || context.state.remainingSeconds != nil {
          compactTimer(
            context: context,
            timerType: context.attributes.timerType ?? .circular,
            progressViewTint: context.attributes.progressViewTint
          ).applyWidgetURL(from: context.attributes.deepLinkUrl)
        }
      } minimal: {
        if context.state.timerEndDateInMilliseconds != nil || context.state.remainingSeconds != nil {
          compactTimer(
            context: context,
            timerType: context.attributes.timerType ?? .circular,
            progressViewTint: context.attributes.progressViewTint
          ).applyWidgetURL(from: context.attributes.deepLinkUrl)
        }
      }
    }
  }

  @ViewBuilder
  private func compactTimer(
    context: ActivityViewContext<LiveActivityAttributes>,
    timerType: LiveActivityAttributes.DynamicIslandTimerType,
    progressViewTint: String?
  ) -> some View {
    if timerType == .digital {
      // Always use native iOS timer calculation for maximum accuracy
      if let endDate = context.state.timerEndDateInMilliseconds {
        Text(timerInterval: Date.toTimerInterval(miliseconds: endDate))
          .font(.system(size: 15))
          .minimumScaleFactor(0.8)
          .fontWeight(.semibold)
          .frame(maxWidth: 60)
          .multilineTextAlignment(.trailing)
      }
    } else {
      if let endDate = context.state.timerEndDateInMilliseconds {
        circularTimer(endDate: endDate)
          .tint(progressViewTint.map { Color(hex: $0) })
      }
    }
  }

  private func dynamicIslandExpandedLeading(title: String, subtitle: String?) -> some View {
    VStack(alignment: .leading) {
      Spacer()
      Text(title)
        .font(.title2)
        .foregroundStyle(.white)
        .fontWeight(.semibold)
      if let subtitle {
        Text(subtitle)
          .font(.title3)
          .minimumScaleFactor(0.8)
          .foregroundStyle(.white.opacity(0.75))
      }
      Spacer()
    }
  }

  private func dynamicIslandExpandedTrailing(context: ActivityViewContext<LiveActivityAttributes>) -> some View {
    VStack {
      Spacer()
      
      // Use programmatic icon with theme-based coloring
      let progressTint = context.attributes.progressViewTint ?? "#007AFF"
      let iconColor: Color = progressTint.contains("pink") || progressTint.contains("ec4899") || progressTint.contains("f472b6") ? .pink : .blue
      
      Image(systemName: "figure.strengthtraining.traditional")
        .font(.system(size: 28, weight: .medium))
        .foregroundColor(iconColor)
        .frame(width: 40, height: 40)
        .background(Circle().fill(Color.black.opacity(0.3)))
        .clipShape(Circle())
      
      Spacer()
    }
  }

  private func dynamicIslandExpandedBottom(endDate: Double, progressViewTint: String?) -> some View {
    ProgressView(timerInterval: Date.toTimerInterval(miliseconds: endDate))
      .foregroundStyle(.white)
      .tint(progressViewTint.map { Color(hex: $0) })
      .padding(.top, 5)
  }

  private func circularTimer(endDate: Double) -> some View {
    ProgressView(
      timerInterval: Date.toTimerInterval(miliseconds: endDate),
      countsDown: false,
      label: { EmptyView() },
      currentValueLabel: {
        EmptyView()
      }
    )
    .progressViewStyle(.circular)
  }
}
