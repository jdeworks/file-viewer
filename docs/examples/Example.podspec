Pod::Spec.new do |s|
  s.name         = 'MyAwesomePod'
  s.version      = '1.4.2'
  s.summary      = 'A concise description of MyAwesomePod.'
  s.description  = 'A much longer description of MyAwesomePod. This library provides useful utilities for building iOS applications.'
  s.homepage     = 'https://github.com/example/MyAwesomePod'
  s.license      = 'MIT'
  s.authors      = { 'Jane Developer' => 'jane@example.com', 'Bob Coder' => 'bob@example.com' }
  s.platform     = :ios, '15.0'
  s.source       = { :git => 'https://github.com/example/MyAwesomePod.git', :tag => s.version.to_s }
  s.source_files = 'Sources/**/*.swift'
  s.swift_versions = '5.0'

  s.dependency 'Alamofire', '~> 5.8'
  s.dependency 'RxSwift', '>= 6.0'
  s.dependency 'SnapKit', '~> 5.6'

  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'Tests/**/*.swift'
    test_spec.dependency 'Quick', '~> 5.0'
    test_spec.dependency 'Nimble', '~> 10.0'
  end
end
