# frozen_string_literal: true

require "fileutils"
require "tmpdir"

RSpec.describe RapidStack::CLI do
  let(:cli) { described_class.new }
  let(:tmp_dir) { Dir.mktmpdir }
  let(:app_name) { "test_app" }
  let(:target_dir) { File.join(tmp_dir, app_name) }

  after do
    FileUtils.remove_entry(tmp_dir)
  end

  describe "#hello" do
    it "outputs a hello message" do
      expect { cli.hello }.to output("Hello from RapidStack!\n").to_stdout
    end
  end

  describe "#new" do
    context "when target directory already exists" do
      before do
        FileUtils.mkdir_p(target_dir)
      end

      it "displays an error message" do
        Dir.chdir(tmp_dir) do
          expect { cli.new(app_name) }.to output(/Directory '#{app_name}' already exists/).to_stdout
        end
      end
    end

    context "when template directory is not found" do
      before do
        allow(cli).to receive(:find_template_dir).and_return("/nonexistent/path")
      end

      it "displays an error message" do
        Dir.chdir(tmp_dir) do
          expect { cli.new(app_name) }.to output(/Error: Template directory not found/).to_stdout
        end
      end
    end

    context "when creating a new project" do
      let(:template_dir) { File.expand_path("../../templates", __dir__) }

      before do
        allow(cli).to receive(:find_template_dir).and_return(template_dir)
      end

      it "creates a new project directory with template files" do
        Dir.chdir(tmp_dir) do
          expect { cli.new(app_name) }.to output(/Project '#{app_name}' created successfully!/).to_stdout
          expect(Dir.exist?(target_dir)).to be true
        end
      end

      it "displays project requirements after creation" do
        Dir.chdir(tmp_dir) do
          # Capture the entire output and test against it
          output = capture_output { cli.new(app_name) }
          expect(output).to include("Project Requirements:")
          expect(output).to include("Ruby Version: >= 3.3.1")
        end
      end
    end
  end

  describe "#say" do
    it "outputs messages in green when specified" do
      expect { cli.send(:say, "Success", :green) }.to output(/Success/).to_stdout
    end

    it "outputs messages in red when specified" do
      expect { cli.send(:say, "Error", :red) }.to output(/Error/).to_stdout
    end

    it "outputs messages without color when no color is specified" do
      expect { cli.send(:say, "Message") }.to output("Message\n").to_stdout
    end
  end

  def capture_output
    original_stdout = $stdout
    output = StringIO.new
    $stdout = output
    yield
    output.string
  ensure
    $stdout = original_stdout
  end
end
