// 日本語 — every user-facing message produced by src/api/apiErrors.js (errorCode, HTTP status, payment state)
// plus shared toast/state copy. Keys must stay byte-identical to the Vietnamese strings in apiErrors.js.
// Toasts (feedbackStore) and SmartDataBoundary translate messages at display time, so the error mapping
// itself stays locale-independent and keyed by stable backend error codes.
export const jaErrors = {
  // Generic / network / auth
  'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.': 'サーバーに接続できません。ネットワークを確認して、もう一度お試しください。',
  'Không thể hoàn tất thao tác. Vui lòng thử lại.': '操作を完了できませんでした。もう一度お試しください。',
  'Hệ thống gặp sự cố. Vui lòng thử lại sau.': 'システムで問題が発生しました。しばらくしてからもう一度お試しください。',
  'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.': 'ログインの有効期限が切れました。もう一度ログインしてください。',
  'Bạn không có quyền truy cập nội dung hoặc thực hiện thao tác này.': 'このコンテンツへのアクセス、またはこの操作を行う権限がありません。',
  'Đăng nhập thành công.': 'ログインしました。',
  'Chưa thực hiện được': '操作を完了できませんでした',
  'Lịch học đã được cập nhật.': '授業スケジュールを更新しました。',
  'Đã nộp bài tập thành công.': '宿題を提出しました。',

  // HTTP status fallbacks
  'Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.': '入力内容に誤りがあります。もう一度ご確認ください。',
  'Không tìm thấy dữ liệu yêu cầu. Có thể dữ liệu đã thay đổi, vui lòng tải lại.': 'データが見つかりません。内容が変更された可能性があるため、再読み込みしてください。',
  'Dữ liệu đã thay đổi hoặc xung đột với trạng thái hiện tại. Vui lòng tải lại và thử lại.': 'データが更新されたか、現在の状態と競合しています。再読み込みしてからもう一度お試しください。',
  'Tệp đính kèm quá lớn. Vui lòng chọn tệp nhỏ hơn 10 MB.': '添付ファイルが大きすぎます。10MB未満のファイルを選んでください。',
  'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận PDF, PNG hoặc JPG.': '対応していないファイル形式です。PDF、PNG、JPGのみアップロードできます。',
  'Dữ liệu chưa đáp ứng quy định. Vui lòng kiểm tra lại.': '入力内容が規定を満たしていません。もう一度ご確認ください。',
  'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.': '操作が多すぎます。数分後にもう一度お試しください。',
  'Dịch vụ liên kết đang gián đoạn. Vui lòng thử lại sau ít phút.': '連携サービスが一時的に利用できません。数分後にもう一度お試しください。',
  'Hệ thống đang bảo trì hoặc quá tải. Vui lòng thử lại sau.': 'メンテナンス中、または混み合っています。しばらくしてからもう一度お試しください。',
  'Máy chủ phản hồi quá lâu. Vui lòng thử lại sau ít phút.': 'サーバーの応答に時間がかかっています。数分後にもう一度お試しください。',

  // Mentor schedule / cohort timetable
  'AI chưa tạo được gợi ý chấm. Bạn vẫn có thể chấm trực tiếp.': 'AIの採点案を作成できませんでした。手動で採点することはできます。',
  'Học viên vừa cập nhật bài nộp. Vui lòng tải lại trước khi chấm.': '受講生が提出物を更新しました。採点の前に再読み込みしてください。',
  'Khung giờ này trùng với lịch dạy đã có. Vui lòng chọn khung giờ khác.': 'この時間帯は既存の授業と重なっています。別の時間帯を選んでください。',
  'Khung giờ không đảm bảo thời gian nghỉ tối thiểu giữa hai buổi dạy. Vui lòng chọn khung giờ khác.': '授業間の最低休憩時間を確保できません。別の時間帯を選んでください。',
  'Khung giờ đăng ký trong ngày đã đạt giới hạn xếp lịch. Vui lòng chọn ngày khác.': '1日のスケジュール配置上限に達しました。別の日を選んでください。',
  'Lịch đăng ký trong tuần đã đạt giới hạn xếp lịch. Vui lòng điều chỉnh lại khung giờ.': '1週間のスケジュール配置上限に達しました。時間帯を調整してください。',
  'Lịch lớp có các buổi trùng thời gian. Vui lòng kiểm tra lại khung giờ đã chọn.': 'クラスの授業日程に重複があります。選んだ時間帯を確認してください。',
  'Lịch lớp vừa được cập nhật ở nơi khác. Vui lòng tải lại và thử lại.': 'クラスのスケジュールが別の場所で更新されました。再読み込みしてからもう一度お試しください。',
  'Lịch lớp đã được công bố nên không thể sửa trực tiếp. Vui lòng gửi yêu cầu dời/hủy lớp.': '公開済みのスケジュールは直接編集できません。日程変更または中止の申請を送ってください。',
  'Lịch lớp chưa đủ số buổi theo khóa học. Vui lòng chọn thêm khung giờ.': 'コースの授業回数に足りていません。時間帯を追加で選してください。',
  'Lịch học lặp theo tuần không hợp lệ. Vui lòng kiểm tra lại các khung giờ đã chọn.': '週間繰り返しスケジュールが無効です。選択した時間帯を確認してください。',
  'Số tuần giảng dạy phải là số nguyên dương từ 1 đến 104 tuần.': '指導週数は1〜104の正の整数で指定してください。',
  'Tổng số buổi của một lớp không vượt quá 1.000 buổi. Vui lòng điều chỉnh số buổi mỗi tuần hoặc số tuần giảng dạy.': '1クラスの総授業数は1,000回を超えることはできません。週回数または指導週数を調整してください。',
  'Không tìm thấy khung thời gian phù hợp để mở lớp trong phạm vi công bố lịch hiện tại.': '現在のスケジュール公開期間内に開講可能な時間帯が見つかりませんでした。',
  'Lịch dự kiến đã thay đổi do có lịch mới hoặc chính sách vừa cập nhật. Vui lòng kiểm tra lại lịch mới nhất trước khi phê duyệt.': '新しい予定や規定の更新により見込みスケジュールが変更されました。承認前に最新スケジュールを確認してください。',

  // Course plans
  'Sĩ số lớp không hợp lệ theo chính sách lớp nhóm hiện hành.': '現在のグループレッスン規定では、この定員は設定できません。',
  'Số buổi học mỗi tuần không hợp lệ. Vui lòng chọn ít nhất 1 buổi mỗi tuần.': '週あたりの授業回数が無効です。週1回以上選択してください。',
  'Thời lượng khóa học chưa hợp lệ (số tuần, tổng số buổi hoặc phút mỗi buổi).': 'コース期間（週数・総授業数・1回の時間）が無効です。',

  // Enrollment & payment
  'Lớp học đã đủ sĩ số. Vui lòng chọn lớp khác.': 'このクラスは定員に達しました。別のクラスを選んでください。',
  'Lớp đã đóng ghi danh. Vui lòng chọn lớp khác.': 'このクラスの申込受付は終了しました。別のクラスを選んでください。',
  'Bạn đã ghi danh lớp này. Vui lòng xem mục "Lớp đang học của tôi".': 'このクラスにはすでに申し込み済みです。「受講中のクラス」をご確認ください。',
  'Lịch lớp này trùng với lịch học khác của bạn. Vui lòng chọn lớp khác.': 'このクラスの日程はほかの授業と重なっています。別のクラスを選んでください。',
  'Không tạo được liên kết thanh toán hợp lệ. Vui lòng thử lại sau ít phút.': '支払いリンクを作成できませんでした。数分後にもう一度お試しください。',
  'Khóa học đã bắt đầu nên không thể tự hủy ghi danh. Bạn có thể gửi khiếu nại nếu cần hỗ trợ.': 'コース開始後はご自身で申込を取り消せません。サポートが必要な場合はお問い合わせを送ってください。',
  'Không thể chuyển lớp sau khi khóa học đã bắt đầu.': 'コース開始後はクラスを変更できません。',
  'Thanh toán đang được xác minh. Vui lòng kiểm tra trạng thái giao dịch.': 'お支払いを確認中です。取引の状況をご確認ください。',
  'Thời gian giữ chỗ đã hết. Vui lòng kiểm tra lại tình trạng lớp trước khi thanh toán.': '席の確保時間が終了しました。お支払いの前にクラスの空き状況をご確認ください。',
  'Thanh toán không thành công. Chỗ đã được giải phóng, bạn có thể đăng ký lại.': 'お支払いが完了しませんでした。確保していた席は解放されたため、もう一度お申し込みいただけます。',
  'Giao dịch đã được ghi nhận nhưng chưa thể hoàn tất ghi danh. Bộ phận quản trị sẽ xem xét yêu cầu của bạn.': 'お支払いは記録されましたが、申込を完了できませんでした。管理者が確認いたします。',
  'Thanh toán đã được xác nhận. Bạn đã ghi danh thành công.': 'お支払いを確認しました。申込が完了しました。',
  'Giao dịch đã bị hủy.': '取引はキャンセルされました。',

  // Cohort schedule requests
  'Lớp đang có một yêu cầu dời/hủy chờ duyệt. Vui lòng chờ kết quả trước khi gửi yêu cầu mới.': '承認待ちの日程変更・中止申請があります。結果が出るまでお待ちください。',
  'Lớp đã có học viên ghi danh thành công nên không thể hủy.': '申込済みの受講生がいるため、このクラスは中止できません。',
  'Lớp đang có giao dịch thanh toán chờ xác minh. Vui lòng thử lại sau.': '確認待ちのお支払いがあります。しばらくしてからもう一度お試しください。',
  'Lớp đang có giao dịch cần Admin xem xét. Vui lòng xử lý giao dịch đó trước.': '管理者の確認が必要な取引があります。先にその取引を処理してください。',
  'Lớp đã khai giảng nên không thể dời hoặc hủy.': '開講済みのため、日程変更や中止はできません。',
  'Lớp học đã được hủy vì không có học viên ghi danh khi đóng tuyển sinh.': '募集締切時点で受講登録者がいなかったため、このクラスは中止されました。',
  'Vui lòng nhập lý do cho yêu cầu.': '申請の理由を入力してください。',

  // Mentor reviews
  'Bạn chỉ có thể đánh giá Mentor đã trực tiếp dạy bạn trong khóa học này.': 'このコースで実際に担当したメンターのみ評価できます。',
  'Bạn đã đánh giá Mentor này cho khóa học. Bạn có thể chỉnh sửa đánh giá đã gửi.': 'このコースのメンターはすでに評価済みです。送信した評価は編集できます。',

  // Self-study & AI credits
  'Tính năng này yêu cầu Gói tự học đang hiệu lực. Vào mục Gói tự học để kích hoạt.': 'この機能を使うには有効な自習プランが必要です。「自習プラン」から有効化してください。',
  'Nhận dạng chữ viết tay từ ảnh yêu cầu Gói tự học hoặc Gói luyện viết.': '画像からの手書き文字認識には、自習プランまたはライティングプランが必要です。',
  'Chấm điểm luyện nói AI yêu cầu Gói tự học hoặc Gói luyện nói.': 'AIによるスピーキング採点には、自習プランまたはスピーキングプランが必要です。',
  'Bạn chưa có lượt chấm AI cho kỹ năng này. Vào mục Gói tự học để mua thêm lượt.': 'このスキルのAI採点回数が残っていません。「自習プラン」から回数を追加購入してください。',

  // System
  'Dữ liệu vừa được cập nhật ở nơi khác. Vui lòng tải lại và thử lại.': 'データが別の場所で更新されました。再読み込みしてからもう一度お試しください。',
  'Yêu cầu này đã được gửi trước đó. Vui lòng kiểm tra lại trạng thái.': 'この申請はすでに送信されています。状況をご確認ください。',

  // Self-study plan checkout (PayOS)
  'Gói học này hiện không còn mở bán. Vui lòng chọn gói khác.': 'このプランは現在販売されていません。別のプランを選んでください。',
  'Gói học đang được cập nhật giá. Vui lòng thử lại sau.': 'プランの価格を更新中です。しばらくしてからもう一度お試しください。',
  'Đơn hàng đang được tạo. Vui lòng đợi trong giây lát rồi thử lại.': '注文を作成中です。少し待ってからもう一度お試しください。',
  'Cổng thanh toán tạm thời chưa sẵn sàng. Vui lòng thử lại sau.': '決済サービスは一時的に利用できません。しばらくしてからもう一度お試しください。',
  'Cổng thanh toán đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.': '決済ゲートウェイへのリクエストが集中しています。数分後にもう一度お試しください。',
  'Cổng thanh toán đang phản hồi chậm. Vui lòng thử lại.': '決済ゲートウェイの応答が遅れています。もう一度お試しください。',
  'Chưa tạo được liên kết thanh toán. Vui lòng thử lại.': '支払いリンクを作成できませんでした。もう一度お試しください。',
  // Shared states (SmartDataBoundary presets & offline)
  'Bạn đang ngoại tuyến. Một số dữ liệu có thể chưa được cập nhật.': 'オフラインです。一部のデータが最新でない可能性があります。',

  // Learner onboarding, placement & roadmap validation
  'Vui lòng chọn chứng chỉ và mục tiêu JLPT (N5–N2) trước khi xem lộ trình học.': '学習ロードマップを表示する前に、資格とJLPT目標（N5〜N2）を設定してください。',
  'Lộ trình hiện hỗ trợ các cấp độ JLPT từ N5 đến N2.': '現在の学習ロードマップはJLPT N5〜N2に対応しています。',
  'Vui lòng thiết lập mục tiêu JLPT (N5–N2) trước khi thực hiện bước tiếp theo.': '次のステップに進む前に、JLPT目標（N5〜N2）を設定してください。',
  'Vui lòng hoàn thành bài đánh giá năng lực hoặc chủ động chọn bỏ qua để mở lộ trình tiêu chuẩn.': '標準ロードマップを開くには、レベル診断を完了するかスキップを選択してください。',
  'Bạn đang có bài đánh giá năng lực chưa hoàn tất. Hãy tiếp tục làm bài để hoàn thiện thiết lập.': '未完了のレベル診断があります。受験を続けて設定を完了してください。',
  'Bạn có lượt đánh giá năng lực đã hết giờ cần nộp để nhận kết quả.': '時間切れのレベル診断があります。提出して結果を受け取ってください。',
  'Vui lòng lưu mục tiêu JLPT hợp lệ trước khi bắt đầu bài đánh giá năng lực.': 'レベル診断を始める前に、有効なJLPT目標を保存してください。',
  'Vui lòng thiết lập mục tiêu JLPT (N5–N2) trước khi tạo lộ trình học AI.': 'AI学習ロードマップを作成する前に、JLPT目標（N5〜N2）を設定してください。',
  'Cần hoàn thành bài đánh giá năng lực hợp lệ trước khi mở khóa lộ trình cá nhân hóa AI.': 'AIパーソナライズロードマップを利用するには、有効なレベル診断の完了が必要です。',
  'Bạn đã có lộ trình AI đang hoạt động. Hãy xem trước và xác nhận để cập nhật.': '有効なAIロードマップがすでにあります。プレビューを確認してから更新してください。',
  'Chế độ lộ trình không hợp lệ. Vui lòng chọn Lộ trình tiêu chuẩn hoặc Lộ trình cá nhân hóa AI.': 'ロードマップのモードが無効です。標準ロードマップまたはAIパーソナライズロードマップを選んでください。',
  'Kết quả đánh giá hiện tại chưa bao phủ đủ cấp độ mục tiêu. Hãy làm bài đánh giá bổ sung hoặc chọn Lộ trình tiêu chuẩn.': '現在のレベル診断結果では目標レベルの範囲を十分にカバーできていません。追加の診断を受けるか、標準ロードマップをお選びください。',
  'Bạn đã sử dụng hết số lượt đánh giá cho phạm vi này theo chính sách hiện hành.': '現行ポリシーにより、この範囲の診断受験回数の上限に達しました。',
  'Hãy mở kết quả đánh giá hiện tại hoặc chọn Đánh giá lại để làm lượt mới.': '現在の診断結果を開くか、「再受験」を選択して新しい受験を開始してください。',
  'Bạn đã dùng hết lượt tạo lộ trình cá nhân hóa AI. Vui lòng mua thêm lượt hoặc sử dụng Lộ trình tiêu chuẩn.': 'AIパーソナライズロードマップの作成回数が上限に達しました。追加回数を購入するか、標準ロードマップをご利用ください。',
  // Practice Sets, Mock Tests & Attempt Lifecycle
  'Đề thi thử JLPT không cho phép xem trước danh sách câu hỏi.': 'JLPT模擬試験では問題一覧の事前プレビューはできません。',
  'Bộ đề luyện tập hiện chưa khả dụng hoặc đang được cập nhật.': 'この練習セットは現在利用できないか、更新中です。',
  'Bạn đang có một lượt thi thử JLPT chưa hoàn thành. Vui lòng tiếp tục hoặc nộp lượt hiện tại.': '未完了のJLPT模擬試験があります。現在の受験を再開するか提出してください。',
  'Lượt làm bài này đã kết thúc do bạn chọn bắt đầu lượt mới.': '新しい受験を開始したため、この受験セッションは終了しました。',
  'Bạn cần hoàn thành ít nhất một lượt thi thử trước khi tải bản PDF của đề thi này.': 'PDFをダウンロードするには、この模擬試験を少なくとも1回完了する必要があります。',
  'Lượt làm bài đã hết thời gian theo đồng hồ máy chủ.': 'サーバー時計の制限時間に達しました。',
  'Lượt làm bài này đã được nộp và chấm điểm.': 'この受験はすでに提出・採点されています。',
};
